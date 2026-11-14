-- =============================================================================
-- WOHKAH · Migration 16: staff records (Phase 2)
--
-- Product owner decisions (2026-11-14): private details are the standard set
-- (date of birth, gender, home address, emergency contact, next of kin, bank
-- details, optional TIN / pension PIN / PFA; no NIN or BVN); staff can VIEW
-- their own record in the staff portal but change nothing; job titles are
-- typed freely.
--
-- * employees: first/last name, staff number (per business, automatic),
--   employment type, start/leaving dates, "reports to" (no cycles), and a
--   status state machine for changes made from the app.
-- * employee_private: restricted 1:1 details (staff.sensitive, or the staff
--   member themselves read-only).
-- * employee_history: append-only log written by triggers only.
-- * employee_documents + private storage bucket "staff-documents"
--   (path: <company_id>/<employee_id>/<file>); no hard deletes; counted
--   against the plan's storage allowance.
-- * Branch-scoped access: a role given for one branch only reaches that
--   branch's staff (app.has_permission_for).
-- * Staff-portal invitations can link a person to their staff record.
--
-- Rollback: drop the three new tables, the new employees columns, the two
-- permissions, the storage bucket/policies; restore the employees policies
-- from migration 10, accept_invitation() from migration 14 and
-- subscription_overview() from 20261114000200.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Permissions
-- ---------------------------------------------------------------------------
insert into public.permissions (key, module, description, is_sensitive, sort_order) values
  ('staff.sensitive', 'staff', 'See and edit private staff details and documents', true, 165),
  ('staff.export',    'staff', 'Download the staff list', true, 168);

insert into public.role_templates (system_key, permission_key) values
  ('owner', 'staff.sensitive'), ('owner', 'staff.export');

insert into public.role_permissions (company_id, role_id, permission_key)
select r.company_id, r.id, p.key
from public.roles r
cross join (values ('staff.sensitive'), ('staff.export')) as p(key)
where r.system_key = 'owner'
on conflict do nothing;

-- ---------------------------------------------------------------------------
-- 2. Staff record: new columns
-- ---------------------------------------------------------------------------
create type public.employment_type as enum ('full_time', 'part_time', 'contract', 'casual', 'intern');

alter table public.employees
  add column first_name text check (first_name is null or char_length(trim(first_name)) between 1 and 60),
  add column last_name text check (last_name is null or char_length(trim(last_name)) between 1 and 60),
  add column staff_number int,
  add column employment_type public.employment_type not null default 'full_time',
  add column start_date date,
  add column end_date date,
  add column reports_to uuid,
  add constraint employees_reports_to_fk foreign key (company_id, reports_to)
    references public.employees (company_id, id),
  add constraint employees_not_own_manager check (reports_to is null or reports_to <> id),
  add constraint employees_dates check (end_date is null or start_date is null or end_date >= start_date);

-- Existing rows: split the name and number them in the order they were added.
update public.employees
set first_name = split_part(trim(full_name), ' ', 1),
    last_name = nullif(trim(substr(trim(full_name), length(split_part(trim(full_name), ' ', 1)) + 1)), '');

with numbered as (
  select id, row_number() over (partition by company_id order by created_at, id) as n
  from public.employees
)
update public.employees e set staff_number = numbered.n from numbered where numbered.id = e.id;

-- The trigger below always assigns the number; the default only keeps clients
-- from having to send one.
alter table public.employees alter column staff_number set default 0;
alter table public.employees alter column staff_number set not null;
create unique index employees_staff_number_uniq on public.employees (company_id, staff_number);
create index employees_reports_to_idx on public.employees (company_id, reports_to);
create index employees_branch_idx on public.employees (company_id, branch_id);

-- Staff number and full name are maintained by the database.
create function app.employees_defaults()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    perform pg_advisory_xact_lock(hashtextextended('employees:' || new.company_id::text, 0));
    select coalesce(max(e.staff_number), 0) + 1 into new.staff_number
    from public.employees e where e.company_id = new.company_id;
  elsif new.staff_number is distinct from old.staff_number then
    new.staff_number := old.staff_number;
  end if;
  if nullif(trim(new.first_name), '') is not null then
    new.full_name := left(trim(concat_ws(' ', trim(new.first_name), nullif(trim(new.last_name), ''))), 120);
  end if;
  return new;
end;
$$;

create trigger employees_defaults
  before insert or update on public.employees
  for each row execute function app.employees_defaults();

-- No reporting cycles (A reports to B reports to A).
create function app.employees_no_cycle()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.reports_to is not null and exists (
    with recursive chain as (
      select e.id, e.reports_to, 1 as depth
      from public.employees e where e.id = new.reports_to
      union all
      select e.id, e.reports_to, c.depth + 1
      from public.employees e join chain c on e.id = c.reports_to
      where c.depth < 100
    )
    select 1 from chain where id = new.id
  ) then
    raise exception 'reporting_cycle' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger employees_no_cycle
  before insert or update of reports_to on public.employees
  for each row execute function app.employees_no_cycle();

-- Status changes made from the app follow the business's real life:
--   active ⇄ on leave / suspended; active, on leave or suspended → left
--   (resigned or terminated); left → active (rejoined) or archived;
--   archived → resigned (restored). The plan pause has its own RPCs.
create function app.staff_status_allowed(p_from public.staff_status, p_to public.staff_status)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p_from = p_to or (p_from, p_to) in (
    ('invited', 'active'), ('invited', 'archived'),
    ('onboarding', 'active'), ('onboarding', 'archived'),
    ('active', 'on_leave'), ('active', 'suspended'), ('active', 'resigned'), ('active', 'terminated'),
    ('on_leave', 'active'), ('on_leave', 'resigned'), ('on_leave', 'terminated'),
    ('suspended', 'active'), ('suspended', 'resigned'), ('suspended', 'terminated'),
    ('resigned', 'active'), ('resigned', 'archived'),
    ('terminated', 'active'), ('terminated', 'archived'),
    ('archived', 'resigned')
  );
$$;

create or replace function app.employees_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if app.is_client_context() then
    if tg_op = 'INSERT' and new.status not in ('active', 'invited') then
      raise exception 'New staff can only be added as active or invited' using errcode = '22023';
    end if;
    if tg_op = 'UPDATE' and new.status is distinct from old.status then
      if new.status = 'plan_suspended' or old.status = 'plan_suspended' then
        raise exception 'Use the staff selection or reactivation steps for paused staff'
          using errcode = '42501';
      end if;
      if not app.staff_status_allowed(old.status, new.status) then
        raise exception 'status_change_not_allowed' using errcode = '22023';
      end if;
    end if;
  end if;
  -- Leaving sets the leaving date; rejoining clears it.
  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status in ('resigned', 'terminated') and new.end_date is null then
      new.end_date := current_date;
    elsif new.status = 'active' and old.status in ('resigned', 'terminated') then
      new.end_date := null;
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Who can reach a staff record
-- ---------------------------------------------------------------------------
-- The staff member's own record (through their sign-in).
create function app.is_own_staff_record(p_company uuid, p_employee uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.employees e
    where e.company_id = p_company and e.id = p_employee
      and e.member_id is not null and e.member_id = app.member_id_for(p_company)
  );
$$;

-- A permission over a given staff member: company-wide, or for their branch.
create function app.has_staff_permission(p_company uuid, p_employee uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.employees e
    where e.company_id = p_company and e.id = p_employee
      and app.has_permission_for(p_company, p_key, e.branch_id)
  );
$$;

drop policy employees_select on public.employees;
drop policy employees_insert on public.employees;
drop policy employees_update on public.employees;
create policy employees_select on public.employees for select to authenticated
  using (
    app.has_permission_for(company_id, 'staff.view', branch_id)
    or member_id = (select app.member_id_for(company_id))
  );
create policy employees_insert on public.employees for insert to authenticated
  with check (app.has_permission_for(company_id, 'staff.manage', branch_id));
create policy employees_update on public.employees for update to authenticated
  using (app.has_permission_for(company_id, 'staff.manage', branch_id))
  with check (app.has_permission_for(company_id, 'staff.manage', branch_id));

grant insert (first_name, last_name, employment_type, start_date, end_date, reports_to)
  on public.employees to authenticated;
grant update (first_name, last_name, employment_type, start_date, end_date, reports_to)
  on public.employees to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Private details (restricted)
-- ---------------------------------------------------------------------------
create table public.employee_private (
  employee_id uuid primary key,
  company_id uuid not null,
  date_of_birth date check (date_of_birth is null or date_of_birth between '1900-01-01' and current_date),
  gender text check (gender is null or gender in ('female', 'male', 'other', 'prefer_not_to_say')),
  home_address jsonb not null default '{}'::jsonb,
  emergency_name text check (emergency_name is null or char_length(emergency_name) <= 120),
  emergency_phone text check (emergency_phone is null or char_length(emergency_phone) <= 32),
  emergency_relationship text check (emergency_relationship is null or char_length(emergency_relationship) <= 60),
  kin_name text check (kin_name is null or char_length(kin_name) <= 120),
  kin_phone text check (kin_phone is null or char_length(kin_phone) <= 32),
  kin_relationship text check (kin_relationship is null or char_length(kin_relationship) <= 60),
  bank_name text check (bank_name is null or char_length(bank_name) <= 100),
  bank_account_number text check (bank_account_number is null or bank_account_number ~ '^[0-9]{6,20}$'),
  bank_account_name text check (bank_account_name is null or char_length(bank_account_name) <= 120),
  tin text check (tin is null or char_length(tin) <= 30),
  pension_pin text check (pension_pin is null or char_length(pension_pin) <= 30),
  pfa_name text check (pfa_name is null or char_length(pfa_name) <= 100),
  updated_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (company_id, employee_id) references public.employees (company_id, id) on delete cascade
);
comment on table public.employee_private is
  'Restricted staff details. Readable with staff.sensitive (company or branch) or by the staff member; writable with staff.sensitive only.';

-- ---------------------------------------------------------------------------
-- 5. History (append-only, written by triggers)
-- ---------------------------------------------------------------------------
create table public.employee_history (
  id bigint generated always as identity primary key,
  company_id uuid not null,
  employee_id uuid not null,
  event text not null check (event in (
    'added', 'status_changed', 'job_title_changed', 'branch_changed', 'manager_changed',
    'employment_type_changed', 'details_updated', 'private_details_updated',
    'document_added', 'document_archived', 'portal_linked'
  )),
  details jsonb not null default '{}'::jsonb,
  actor_user_id uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  foreign key (company_id, employee_id) references public.employees (company_id, id) on delete cascade
);
create index employee_history_idx on public.employee_history (company_id, employee_id, created_at desc);
create trigger append_only before update or delete on public.employee_history
  for each row execute function app.block_mutation();

create function app.employees_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_branch_old text;
  v_branch_new text;
begin
  if tg_op = 'INSERT' then
    insert into public.employee_history (company_id, employee_id, event, details)
    values (new.company_id, new.id, 'added', jsonb_build_object('status', new.status));
    return null;
  end if;
  if new.status is distinct from old.status then
    insert into public.employee_history (company_id, employee_id, event, details)
    values (new.company_id, new.id, 'status_changed', jsonb_build_object('from', old.status, 'to', new.status));
  end if;
  if new.job_title is distinct from old.job_title then
    insert into public.employee_history (company_id, employee_id, event, details)
    values (new.company_id, new.id, 'job_title_changed', jsonb_build_object('from', old.job_title, 'to', new.job_title));
  end if;
  if new.branch_id is distinct from old.branch_id then
    select name into v_branch_old from public.branches where id = old.branch_id;
    select name into v_branch_new from public.branches where id = new.branch_id;
    insert into public.employee_history (company_id, employee_id, event, details)
    values (new.company_id, new.id, 'branch_changed', jsonb_build_object('from', v_branch_old, 'to', v_branch_new));
  end if;
  if new.reports_to is distinct from old.reports_to then
    insert into public.employee_history (company_id, employee_id, event, details)
    values (new.company_id, new.id, 'manager_changed', jsonb_build_object(
      'from', (select full_name from public.employees where id = old.reports_to),
      'to', (select full_name from public.employees where id = new.reports_to)));
  end if;
  if new.employment_type is distinct from old.employment_type then
    insert into public.employee_history (company_id, employee_id, event, details)
    values (new.company_id, new.id, 'employment_type_changed',
            jsonb_build_object('from', old.employment_type, 'to', new.employment_type));
  end if;
  if (new.full_name, new.email, new.phone, new.start_date)
     is distinct from (old.full_name, old.email, old.phone, old.start_date) then
    insert into public.employee_history (company_id, employee_id, event, details)
    values (new.company_id, new.id, 'details_updated', '{}'::jsonb);
  end if;
  if new.member_id is distinct from old.member_id and new.member_id is not null then
    insert into public.employee_history (company_id, employee_id, event, details)
    values (new.company_id, new.id, 'portal_linked', '{}'::jsonb);
  end if;
  return null;
end;
$$;

create trigger employees_history
  after insert or update on public.employees
  for each row execute function app.employees_history();

-- Private details: record that they changed, never the values.
create function app.employee_private_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.employee_history (company_id, employee_id, event, details)
  values (new.company_id, new.employee_id, 'private_details_updated', '{}'::jsonb);
  return null;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Documents
-- ---------------------------------------------------------------------------
create table public.employee_documents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  employee_id uuid not null,
  category text not null check (category in (
    'contract', 'id_document', 'certificate', 'guarantor', 'letter', 'other')),
  name text not null check (char_length(trim(name)) between 1 and 150),
  storage_path text not null unique,
  size_bytes bigint not null check (size_bytes > 0),
  content_type text,
  uploaded_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  archived_at timestamptz,
  archived_by uuid references auth.users (id) on delete set null,
  unique (company_id, id),
  foreign key (company_id, employee_id) references public.employees (company_id, id) on delete restrict,
  check (storage_path like company_id::text || '/' || employee_id::text || '/%')
);
create index employee_documents_idx on public.employee_documents (company_id, employee_id, created_at desc);

-- Files count against the plan's storage allowance (archived ones still take space).
create function app.employee_documents_checks()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit int := app.company_feature_limit(new.company_id, 'storage_mb');
  v_used bigint;
begin
  if tg_op = 'INSERT' then
    select coalesce(sum(size_bytes), 0) into v_used
    from public.employee_documents where company_id = new.company_id;
    if v_limit is not null and v_used + new.size_bytes > v_limit::bigint * 1024 * 1024 then
      raise exception 'storage_limit_exceeded:%', v_limit using errcode = 'P0001';
    end if;
    insert into public.employee_history (company_id, employee_id, event, details)
    values (new.company_id, new.employee_id, 'document_added', jsonb_build_object('name', new.name));
    return new;
  end if;
  -- Updates: only archiving or restoring.
  if (new.name, new.category, new.storage_path, new.size_bytes, new.employee_id)
     is distinct from (old.name, old.category, old.storage_path, old.size_bytes, old.employee_id) then
    raise exception 'Documents can only be archived or restored' using errcode = '42501';
  end if;
  if new.archived_at is not null and old.archived_at is null then
    new.archived_by := auth.uid();
    insert into public.employee_history (company_id, employee_id, event, details)
    values (new.company_id, new.employee_id, 'document_archived', jsonb_build_object('name', new.name));
  end if;
  return new;
end;
$$;

create trigger employee_documents_checks
  before insert or update on public.employee_documents
  for each row execute function app.employee_documents_checks();

-- ---------------------------------------------------------------------------
-- 7. Common triggers, row security and privileges
-- ---------------------------------------------------------------------------
create trigger set_updated_at before update on public.employee_private
  for each row execute function app.set_updated_at();
create trigger employee_private_history after insert or update on public.employee_private
  for each row execute function app.employee_private_history();

do $$
declare
  t text;
begin
  foreach t in array array['employee_private', 'employee_history', 'employee_documents'] loop
    execute format('create trigger prevent_company_change before update on public.%I
                    for each row execute function app.prevent_company_change()', t);
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
  foreach t in array array['employee_private', 'employee_documents'] loop
    execute format('create trigger audit after insert or update or delete on public.%I
                    for each row execute function app.audit_row()', t);
  end loop;
end;
$$;

grant select on public.employee_private to authenticated;
grant insert (employee_id, company_id, date_of_birth, gender, home_address, emergency_name,
              emergency_phone, emergency_relationship, kin_name, kin_phone, kin_relationship,
              bank_name, bank_account_number, bank_account_name, tin, pension_pin, pfa_name)
  on public.employee_private to authenticated;
grant update (date_of_birth, gender, home_address, emergency_name, emergency_phone,
              emergency_relationship, kin_name, kin_phone, kin_relationship, bank_name,
              bank_account_number, bank_account_name, tin, pension_pin, pfa_name)
  on public.employee_private to authenticated;
create policy employee_private_select on public.employee_private for select to authenticated
  using (
    app.has_staff_permission(company_id, employee_id, 'staff.sensitive')
    or app.is_own_staff_record(company_id, employee_id)
  );
create policy employee_private_insert on public.employee_private for insert to authenticated
  with check (app.has_staff_permission(company_id, employee_id, 'staff.sensitive'));
create policy employee_private_update on public.employee_private for update to authenticated
  using (app.has_staff_permission(company_id, employee_id, 'staff.sensitive'))
  with check (app.has_staff_permission(company_id, employee_id, 'staff.sensitive'));

grant select on public.employee_history to authenticated;
create policy employee_history_select on public.employee_history for select to authenticated
  using (
    app.has_staff_permission(company_id, employee_id, 'staff.view')
    or app.is_own_staff_record(company_id, employee_id)
  );

grant select on public.employee_documents to authenticated;
grant insert (company_id, employee_id, category, name, storage_path, size_bytes, content_type)
  on public.employee_documents to authenticated;
grant update (archived_at) on public.employee_documents to authenticated;
create policy employee_documents_select on public.employee_documents for select to authenticated
  using (
    app.has_staff_permission(company_id, employee_id, 'staff.sensitive')
    or app.is_own_staff_record(company_id, employee_id)
  );
create policy employee_documents_insert on public.employee_documents for insert to authenticated
  with check (
    app.has_staff_permission(company_id, employee_id, 'staff.manage')
    and app.has_staff_permission(company_id, employee_id, 'staff.sensitive')
  );
create policy employee_documents_update on public.employee_documents for update to authenticated
  using (
    app.has_staff_permission(company_id, employee_id, 'staff.manage')
    and app.has_staff_permission(company_id, employee_id, 'staff.sensitive')
  )
  with check (
    app.has_staff_permission(company_id, employee_id, 'staff.manage')
    and app.has_staff_permission(company_id, employee_id, 'staff.sensitive')
  );

-- ---------------------------------------------------------------------------
-- 8. Private file storage (only where Supabase Storage is installed)
-- ---------------------------------------------------------------------------
do $do$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('staff-documents', 'staff-documents', false, 10485760,
            array['application/pdf', 'image/jpeg', 'image/png', 'image/webp',
                  'application/msword',
                  'application/vnd.openxmlformats-officedocument.wordprocessingml.document'])
    on conflict (id) do nothing;

    -- Path: <company_id>/<employee_id>/<file>. Uploads need staff.manage and
    -- staff.sensitive for that staff member; reading needs staff.sensitive or
    -- being that staff member. No updates or deletes from the app.
    execute $p$
      create policy staff_documents_insert on storage.objects for insert to authenticated
      with check (
        bucket_id = 'staff-documents'
        and app.has_staff_permission(((storage.foldername(name))[1])::uuid,
                                     ((storage.foldername(name))[2])::uuid, 'staff.manage')
        and app.has_staff_permission(((storage.foldername(name))[1])::uuid,
                                     ((storage.foldername(name))[2])::uuid, 'staff.sensitive')
      )
    $p$;
    execute $p$
      create policy staff_documents_select on storage.objects for select to authenticated
      using (
        bucket_id = 'staff-documents'
        and (
          app.has_staff_permission(((storage.foldername(name))[1])::uuid,
                                   ((storage.foldername(name))[2])::uuid, 'staff.sensitive')
          or app.is_own_staff_record(((storage.foldername(name))[1])::uuid,
                                     ((storage.foldername(name))[2])::uuid)
        )
      )
    $p$;
  end if;
end;
$do$;

-- ---------------------------------------------------------------------------
-- 9. Staff-portal invitations linked to a staff record
-- ---------------------------------------------------------------------------
alter table public.company_invitations
  add column employee_id uuid,
  add constraint company_invitations_employee_fk foreign key (company_id, employee_id)
    references public.employees (company_id, id);
grant insert (employee_id) on public.company_invitations to authenticated;

-- Linking someone to a record gives them read access to it, so it needs
-- staff.manage for that person, a record not already linked, and an
-- invitation sent to the email on the staff record.
create function app.company_invitations_employee_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_emp public.employees;
begin
  if new.employee_id is null then
    return new;
  end if;
  select * into v_emp from public.employees
  where company_id = new.company_id and id = new.employee_id;
  if app.is_client_context() and not app.has_staff_permission(new.company_id, new.employee_id, 'staff.manage') then
    raise exception 'You don''t have access to this staff record' using errcode = '42501';
  end if;
  if v_emp.member_id is not null then
    raise exception 'staff_already_linked' using errcode = '22023';
  end if;
  if v_emp.email is null or lower(v_emp.email::text) <> lower(new.email::text) then
    raise exception 'staff_email_mismatch' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger company_invitations_employee_guard
  before insert on public.company_invitations
  for each row execute function app.company_invitations_employee_guard();

create or replace function public.accept_invitation(p_token text)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_inv public.company_invitations;
  v_email text;
  v_confirmed timestamptz;
  v_member uuid;
  v_role uuid;
  v_roles uuid[];
  v_slug text;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_inv
  from public.company_invitations i
  where i.token_hash = app.hash_token(p_token)
  for update;

  if not found or v_inv.status <> 'pending' or v_inv.expires_at <= now() then
    raise exception 'invitation_invalid' using errcode = '22023';
  end if;

  select c.slug::text into v_slug
  from public.companies c where c.id = v_inv.company_id and c.status = 'active';
  if v_slug is null then
    raise exception 'invitation_invalid' using errcode = '22023';
  end if;

  select u.email, u.email_confirmed_at into v_email, v_confirmed
  from auth.users u where u.id = v_uid;

  if lower(v_email) <> lower(v_inv.email::text) then
    raise exception 'invitation_email_mismatch' using errcode = '42501';
  end if;
  if v_confirmed is null then
    raise exception 'email_not_confirmed' using errcode = '42501';
  end if;

  insert into public.company_members (company_id, user_id, status, invited_by)
  values (v_inv.company_id, v_uid, 'active', v_inv.invited_by)
  on conflict (company_id, user_id)
    do update set status = 'active', removed_at = null
  returning id into v_member;

  -- No roles = basic access only (their own staff portal). Businesses decide
  -- every other role themselves.
  v_roles := coalesce(v_inv.role_ids, '{}');

  foreach v_role in array v_roles loop
    insert into public.member_roles (company_id, member_id, role_id, scope_type, created_by)
    values (v_inv.company_id, v_member, v_role, 'company', v_inv.invited_by)
    on conflict do nothing;
  end loop;

  -- A staff-portal invitation links the new member to their staff record.
  if v_inv.employee_id is not null then
    update public.employees
    set member_id = v_member
    where company_id = v_inv.company_id and id = v_inv.employee_id and member_id is null;
  end if;

  update public.company_invitations
  set status = 'accepted', accepted_at = now(), accepted_by = v_uid
  where id = v_inv.id;

  return v_slug;
end;
$$;


grant execute on all functions in schema app to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Storage used on the subscription page now counts staff documents (MB, rounded up).
-- ---------------------------------------------------------------------------
create or replace function public.subscription_overview(p_company uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_sub public.company_subscriptions;
  v_plan public.subscription_plans;
  v_pending text;
  v_trial public.trial_grants;
  v_extras record;
begin
  if not app.has_company_permission(p_company, 'subscription.view') then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  select * into v_sub from public.company_subscriptions where company_id = p_company;
  select * into v_plan from public.subscription_plans where id = app.company_plan_id(p_company);
  select code into v_pending from public.subscription_plans where id = v_sub.pending_plan_id;
  select * into v_trial from public.trial_grants where company_id = p_company;
  select * into v_extras from app.company_paid_extras(p_company);

  return jsonb_build_object(
    'plan_code', v_plan.code,
    'status', v_sub.status,
    'billing_interval', v_sub.billing_interval,
    'current_period_end', v_sub.current_period_end,
    'trial', case when v_trial.id is null then null else jsonb_build_object(
      'plan_code', (select code from public.subscription_plans where id = v_trial.plan_id),
      'started_at', v_trial.started_at, 'ends_at', v_trial.ends_at, 'outcome', v_trial.outcome) end,
    'pending_plan_code', v_pending,
    'pending_change_at', v_sub.pending_change_at,
    'staff_selection_required', v_sub.staff_selection_required,
    'usage', jsonb_build_object(
      'active_staff', app.count_active_staff(p_company),
      'paused_staff', (select count(*) from public.employees
                        where company_id = p_company and status = 'plan_suspended'),
      'admins', app.count_admins(p_company),
      'branches', (select count(*) from public.branches where company_id = p_company and archived_at is null),
      'work_locations', (select count(*) from public.work_locations where company_id = p_company and archived_at is null),
      'storage_mb', (select ceil(coalesce(sum(size_bytes), 0) / 1048576.0)::int
                       from public.employee_documents where company_id = p_company)
    ),
    'allowances', jsonb_build_object(
      'staff', app.company_staff_allowance(p_company),
      'extra_staff', v_extras.extra_staff,
      'work_locations', app.company_work_location_allowance(p_company),
      'extra_work_locations', v_extras.extra_locations,
      'admins', app.company_feature_limit(p_company, 'admins'),
      'branches', app.company_feature_limit(p_company, 'branches'),
      'storage_mb', app.company_feature_limit(p_company, 'storage_mb')
    )
  );
end;
$$;
