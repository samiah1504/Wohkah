-- =============================================================================
-- Phase 3 (part): contracts, signing, job descriptions and acknowledgements.
--
-- * contract_templates: the business's own templates (written in WOHKAH's
--   editor; starter templates are copied in from the app).
-- * contracts: one document for one staff member. Drafts can be edited; once
--   sent, the content is frozen and fingerprinted (SHA-256) by the database.
--   kind 'contract' is signed by the staff member AND the business;
--   kind 'policy' is acknowledged (signed) by the staff member only.
-- * contract_signatures / contract_events: append-only evidence. Signatures
--   are written only by public.record_contract_signature(), executable by the
--   service role after the server has checked the signer's emailed code.
-- * contract_signing_codes: hashed one-time codes (service role only).
-- * job_descriptions + job_description_versions (immutable versions),
--   employees.job_description_id, job_description_acknowledgements.
-- * Permissions contracts.manage, contracts.sign, job_descriptions.manage
--   (given to Owner). Creating and sending need the plan features
--   digital_contracts / job_descriptions (Starter and above).
-- * Private storage bucket "contracts" for the final signed PDFs.
--
-- Rollback: drop the functions below, the tables contract_signing_codes,
-- contract_signatures, contract_events, contracts, contract_templates,
-- job_description_acknowledgements, job_description_versions,
-- job_descriptions (after dropping employees.job_description_id), the types
-- contract_status and contract_kind, the three permissions and the bucket.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Permissions
-- ---------------------------------------------------------------------------
insert into public.permissions (key, module, description, is_sensitive, sort_order) values
  ('contracts.manage', 'documents', 'Write contract templates, prepare contracts and send them for signing', true, 300),
  ('contracts.sign', 'documents', 'Sign contracts on behalf of the business', true, 310),
  ('job_descriptions.manage', 'documents', 'Write job descriptions and ask staff to acknowledge them', false, 320);

insert into public.role_templates (system_key, permission_key) values
  ('owner', 'contracts.manage'), ('owner', 'contracts.sign'), ('owner', 'job_descriptions.manage');

insert into public.role_permissions (company_id, role_id, permission_key)
select r.company_id, r.id, p.key
from public.roles r
cross join (values ('contracts.manage'), ('contracts.sign'), ('job_descriptions.manage')) as p(key)
where r.system_key = 'owner'
on conflict do nothing;

-- A permission held in any scope (company-wide or for any branch).
create function app.has_permission_anywhere(p_company uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members m
    join public.member_roles mr on mr.member_id = m.id
    join public.role_permissions rp on rp.role_id = mr.role_id
    where m.company_id = p_company
      and m.user_id = (select auth.uid())
      and m.status = 'active'
      and rp.permission_key = p_key
  );
$$;
revoke all on function app.has_permission_anywhere(uuid, text) from public, anon;
grant execute on function app.has_permission_anywhere(uuid, text) to authenticated, service_role;

-- The same company-wide check for a given user (used by service-role functions).
create function app.user_has_company_permission(p_company uuid, p_user uuid, p_key text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.company_members m
    join public.member_roles mr on mr.member_id = m.id and mr.scope_type = 'company'
    join public.role_permissions rp on rp.role_id = mr.role_id
    where m.company_id = p_company
      and m.user_id = p_user
      and m.status = 'active'
      and rp.permission_key = p_key
  );
$$;
revoke all on function app.user_has_company_permission(uuid, uuid, text) from public, anon, authenticated;
grant execute on function app.user_has_company_permission(uuid, uuid, text) to service_role;

-- ---------------------------------------------------------------------------
-- 2. Contract templates
-- ---------------------------------------------------------------------------
create type public.contract_kind as enum ('contract', 'policy');
create type public.contract_status as enum ('draft', 'awaiting_signatures', 'completed', 'cancelled');

create table public.contract_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  kind public.contract_kind not null default 'contract',
  name text not null check (char_length(trim(name)) between 1 and 120),
  body text not null check (char_length(body) between 1 and 60000),
  starter_key text check (starter_key is null or starter_key ~ '^[a-z0-9_]{1,40}$'),
  archived_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id)
);
create index contract_templates_company_idx on public.contract_templates (company_id, archived_at, name);

-- ---------------------------------------------------------------------------
-- 3. Contracts
-- ---------------------------------------------------------------------------
create table public.contracts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  employee_id uuid not null,
  template_id uuid,
  kind public.contract_kind not null default 'contract',
  title text not null check (char_length(trim(title)) between 1 and 150),
  body text not null check (char_length(body) between 1 and 60000),
  status public.contract_status not null default 'draft',
  amends_id uuid,
  content_hash text check (content_hash is null or content_hash ~ '^[0-9a-f]{64}$'),
  sent_at timestamptz,
  sent_by uuid references auth.users (id) on delete set null,
  completed_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by uuid references auth.users (id) on delete set null,
  cancel_reason text check (cancel_reason is null or char_length(cancel_reason) <= 300),
  final_pdf_path text,
  final_pdf_hash text check (final_pdf_hash is null or final_pdf_hash ~ '^[0-9a-f]{64}$'),
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id),
  foreign key (company_id, employee_id) references public.employees (company_id, id) on delete restrict,
  foreign key (company_id, template_id) references public.contract_templates (company_id, id),
  foreign key (company_id, amends_id) references public.contracts (company_id, id),
  check (amends_id is null or amends_id <> id),
  check ((status = 'draft') = (content_hash is null)),
  check (final_pdf_path is null or final_pdf_path like company_id::text || '/' || id::text || '/%')
);
create index contracts_company_idx on public.contracts (company_id, status, created_at desc);
create index contracts_employee_idx on public.contracts (company_id, employee_id, created_at desc);

-- The fingerprint of what is signed: id, title and body exactly as sent.
create function app.contract_content_hash(p_id uuid, p_title text, p_body text)
returns text
language sql
immutable
set search_path = ''
as $$
  select encode(sha256(convert_to(p_id::text || E'\n' || p_title || E'\n\n' || p_body, 'UTF8')), 'hex');
$$;

-- Clients may only edit a draft's title and body; everything else goes
-- through the functions below.
create function app.contracts_guard()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if app.is_client_context() then
      if not app.company_has_feature(new.company_id, 'digital_contracts') then
        raise exception 'feature_not_in_plan:digital_contracts' using errcode = 'P0001';
      end if;
      new.status := 'draft';
      new.content_hash := null;
      new.created_by := auth.uid();
    end if;
    if new.amends_id is not null and not exists (
      select 1 from public.contracts p
      where p.company_id = new.company_id and p.id = new.amends_id
        and p.employee_id = new.employee_id and p.status = 'completed'
    ) then
      raise exception 'Only a signed contract for the same staff member can be amended' using errcode = '22023';
    end if;
    return new;
  end if;
  if old.status <> 'draft' and (new.title, new.body) is distinct from (old.title, old.body) then
    raise exception 'contract_locked' using errcode = '42501';
  end if;
  if old.final_pdf_path is not null and new.final_pdf_path is distinct from old.final_pdf_path then
    raise exception 'contract_locked' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger contracts_guard before insert or update on public.contracts
  for each row execute function app.contracts_guard();

-- ---------------------------------------------------------------------------
-- 4. Evidence: events, signatures, codes
-- ---------------------------------------------------------------------------
create table public.contract_events (
  id bigint generated always as identity primary key,
  company_id uuid not null,
  contract_id uuid not null,
  event text not null check (event in (
    'created', 'sent', 'viewed', 'code_sent', 'signed', 'completed', 'cancelled', 'final_document')),
  party text check (party is null or party in ('staff', 'business')),
  actor_user_id uuid references auth.users (id) on delete set null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (company_id, contract_id) references public.contracts (company_id, id) on delete cascade
);
create index contract_events_idx on public.contract_events (company_id, contract_id, id);

create table public.contract_signatures (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  contract_id uuid not null,
  party text not null check (party in ('staff', 'business')),
  signer_user_id uuid not null references auth.users (id),
  signer_name text not null check (char_length(trim(signer_name)) between 1 and 120),
  mark_type text not null check (mark_type in ('typed', 'drawn')),
  mark text not null check (char_length(mark) between 1 and 200000),
  consent_text text not null check (char_length(consent_text) between 1 and 2000),
  consent_version text not null check (char_length(consent_version) between 1 and 20),
  content_hash text not null check (content_hash ~ '^[0-9a-f]{64}$'),
  ip_address inet,
  user_agent text check (user_agent is null or char_length(user_agent) <= 500),
  code_verified_at timestamptz not null,
  signed_at timestamptz not null default now(),
  unique (contract_id, party),
  foreign key (company_id, contract_id) references public.contracts (company_id, id) on delete restrict
);

create table public.contract_signing_codes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  contract_id uuid not null,
  user_id uuid not null references auth.users (id) on delete cascade,
  code_hash text not null check (code_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null,
  attempts int not null default 0 check (attempts between 0 and 10),
  used_at timestamptz,
  created_at timestamptz not null default now(),
  foreign key (company_id, contract_id) references public.contracts (company_id, id) on delete cascade
);
create index contract_signing_codes_idx on public.contract_signing_codes (contract_id, user_id, created_at desc);

-- Events for creation and status changes.
create function app.contracts_events()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.contract_events (company_id, contract_id, event, actor_user_id, details)
    values (new.company_id, new.id, 'created', auth.uid(),
            jsonb_build_object('title', new.title, 'template_id', new.template_id, 'amends_id', new.amends_id));
  elsif new.status is distinct from old.status then
    insert into public.contract_events (company_id, contract_id, event, actor_user_id, details)
    values (new.company_id, new.id,
            case new.status when 'awaiting_signatures' then 'sent' when 'completed' then 'completed'
                            else 'cancelled' end,
            auth.uid(),
            case when new.status = 'awaiting_signatures' then jsonb_build_object('content_hash', new.content_hash)
                 when new.status = 'cancelled' then jsonb_build_object('reason', new.cancel_reason)
                 else '{}'::jsonb end);
  end if;
  return null;
end;
$$;
create trigger contracts_events after insert or update on public.contracts
  for each row execute function app.contracts_events();

-- ---------------------------------------------------------------------------
-- 5. Who can see a contract
-- ---------------------------------------------------------------------------
create function app.can_view_contract(p_company uuid, p_employee uuid, p_status public.contract_status)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.has_staff_permission(p_company, p_employee, 'contracts.manage')
    or (p_status <> 'draft' and (
      app.has_company_permission(p_company, 'contracts.sign')
      or app.is_own_staff_record(p_company, p_employee)
    ));
$$;
revoke all on function app.can_view_contract(uuid, uuid, public.contract_status) from public, anon;
grant execute on function app.can_view_contract(uuid, uuid, public.contract_status) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 6. Actions (RPC)
-- ---------------------------------------------------------------------------

-- Freeze a draft and send it for signing.
create function public.send_contract(p_contract uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.contracts;
begin
  select * into v from public.contracts where id = p_contract for update;
  if v.id is null or not app.has_staff_permission(v.company_id, v.employee_id, 'contracts.manage') then
    raise exception 'You don''t have access to this contract' using errcode = '42501';
  end if;
  if not app.company_has_feature(v.company_id, 'digital_contracts') then
    raise exception 'feature_not_in_plan:digital_contracts' using errcode = 'P0001';
  end if;
  if v.status <> 'draft' then
    raise exception 'contract_locked' using errcode = '42501';
  end if;
  if v.title ~ '\{\{' or v.body ~ '\{\{' then
    raise exception 'contract_has_blanks' using errcode = '22023';
  end if;
  update public.contracts
  set status = 'awaiting_signatures',
      content_hash = app.contract_content_hash(v.id, v.title, v.body),
      sent_at = now(),
      sent_by = auth.uid()
  where id = v.id;
  return app.contract_content_hash(v.id, v.title, v.body);
end;
$$;

create function public.cancel_contract(p_contract uuid, p_reason text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.contracts;
begin
  select * into v from public.contracts where id = p_contract for update;
  if v.id is null or not app.has_staff_permission(v.company_id, v.employee_id, 'contracts.manage') then
    raise exception 'You don''t have access to this contract' using errcode = '42501';
  end if;
  if v.status not in ('draft', 'awaiting_signatures') then
    raise exception 'contract_locked' using errcode = '42501';
  end if;
  update public.contracts
  set status = 'cancelled', cancelled_at = now(), cancelled_by = auth.uid(),
      cancel_reason = nullif(left(trim(coalesce(p_reason, '')), 300), ''),
      content_hash = coalesce(content_hash, app.contract_content_hash(id, title, body))
  where id = v.id;
end;
$$;

-- Record that someone opened the document to read it before signing.
create function public.record_contract_view(p_contract uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.contracts;
  v_party text;
begin
  select * into v from public.contracts where id = p_contract;
  if v.id is null or v.status = 'draft' then
    return;
  end if;
  if app.is_own_staff_record(v.company_id, v.employee_id) then
    v_party := 'staff';
  elsif v.kind = 'contract' and app.has_company_permission(v.company_id, 'contracts.sign') then
    v_party := 'business';
  else
    return;
  end if;
  insert into public.contract_events (company_id, contract_id, event, party, actor_user_id, details)
  values (v.company_id, v.id, 'viewed', v_party, auth.uid(), jsonb_build_object('content_hash', v.content_hash));
end;
$$;

-- Which party (if any) the given user signs for. Service role only.
create function app.contract_party_for(p_contract uuid, p_user uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1 from public.employees e
      join public.company_members m on m.id = e.member_id
      where e.company_id = c.company_id and e.id = c.employee_id
        and m.user_id = p_user and m.status = 'active'
    ) then 'staff'
    when c.kind = 'contract'
      and app.user_has_company_permission(c.company_id, p_user, 'contracts.sign') then 'business'
    else null
  end
  from public.contracts c where c.id = p_contract;
$$;
revoke all on function app.contract_party_for(uuid, uuid) from public, anon, authenticated;
grant execute on function app.contract_party_for(uuid, uuid) to service_role;

-- Record a signature after the server verified the signer's emailed code.
-- Service role only: the server is the only caller that can vouch for the code.
create function public.record_contract_signature(
  p_contract uuid,
  p_user uuid,
  p_party text,
  p_signer_name text,
  p_mark_type text,
  p_mark text,
  p_consent_text text,
  p_consent_version text,
  p_content_hash text,
  p_ip inet,
  p_user_agent text,
  p_code_verified_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.contracts;
  v_needed int;
  v_done int;
begin
  select * into v from public.contracts where id = p_contract for update;
  if v.id is null then
    raise exception 'contract_not_found' using errcode = '22023';
  end if;
  if v.status <> 'awaiting_signatures' then
    raise exception 'contract_not_awaiting_signatures' using errcode = '22023';
  end if;
  if v.content_hash is distinct from p_content_hash then
    raise exception 'contract_changed' using errcode = '22023';
  end if;
  if app.contract_party_for(v.id, p_user) is distinct from p_party
     and not (p_party = 'business' and v.kind = 'contract'
              and app.user_has_company_permission(v.company_id, p_user, 'contracts.sign')) then
    raise exception 'not_a_signer' using errcode = '42501';
  end if;
  if p_party = 'business' and exists (
    select 1 from public.contract_signatures s
    where s.contract_id = v.id and s.signer_user_id = p_user
  ) then
    raise exception 'same_person_both_parties' using errcode = '22023';
  end if;
  if p_party = 'staff' and exists (
    select 1 from public.contract_signatures s
    where s.contract_id = v.id and s.party = 'business' and s.signer_user_id = p_user
  ) then
    raise exception 'same_person_both_parties' using errcode = '22023';
  end if;
  if exists (select 1 from public.contract_signatures s where s.contract_id = v.id and s.party = p_party) then
    raise exception 'already_signed' using errcode = '22023';
  end if;

  insert into public.contract_signatures (
    company_id, contract_id, party, signer_user_id, signer_name, mark_type, mark,
    consent_text, consent_version, content_hash, ip_address, user_agent, code_verified_at)
  values (
    v.company_id, v.id, p_party, p_user, trim(p_signer_name), p_mark_type, p_mark,
    p_consent_text, p_consent_version, p_content_hash, p_ip, left(nullif(p_user_agent, ''), 500), p_code_verified_at);

  insert into public.contract_events (company_id, contract_id, event, party, actor_user_id, details)
  values (v.company_id, v.id, 'signed', p_party, p_user,
          jsonb_build_object('signer_name', trim(p_signer_name), 'content_hash', p_content_hash));

  v_needed := case when v.kind = 'contract' then 2 else 1 end;
  select count(*) into v_done from public.contract_signatures where contract_id = v.id;
  if v_done >= v_needed then
    update public.contracts set status = 'completed', completed_at = now() where id = v.id;
  end if;
  return jsonb_build_object('completed', v_done >= v_needed);
end;
$$;
revoke all on function public.record_contract_signature(uuid, uuid, text, text, text, text, text, text, text, inet, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.record_contract_signature(uuid, uuid, text, text, text, text, text, text, text, inet, text, timestamptz)
  to service_role;

-- The final signed PDF (with its signing certificate) is stored once.
create function public.set_contract_final_document(p_contract uuid, p_path text, p_hash text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.contracts;
begin
  select * into v from public.contracts where id = p_contract for update;
  if v.id is null or v.status <> 'completed' then
    raise exception 'contract_not_completed' using errcode = '22023';
  end if;
  if v.final_pdf_path is not null then
    return;
  end if;
  update public.contracts set final_pdf_path = p_path, final_pdf_hash = p_hash where id = v.id;
  insert into public.contract_events (company_id, contract_id, event, details)
  values (v.company_id, v.id, 'final_document', jsonb_build_object('sha256', p_hash));
end;
$$;
revoke all on function public.set_contract_final_document(uuid, text, text) from public, anon, authenticated;
grant execute on function public.set_contract_final_document(uuid, text, text) to service_role;

revoke all on function public.send_contract(uuid) from public, anon;
revoke all on function public.cancel_contract(uuid, text) from public, anon;
revoke all on function public.record_contract_view(uuid) from public, anon;
grant execute on function public.send_contract(uuid) to authenticated;
grant execute on function public.cancel_contract(uuid, text) to authenticated;
grant execute on function public.record_contract_view(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Job descriptions
-- ---------------------------------------------------------------------------
create table public.job_descriptions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies (id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  archived_at timestamptz,
  created_by uuid references auth.users (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, id)
);
create index job_descriptions_company_idx on public.job_descriptions (company_id, archived_at, title);

create table public.job_description_versions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  job_description_id uuid not null,
  version int not null default 0,
  body text not null check (char_length(body) between 1 and 30000),
  change_note text check (change_note is null or char_length(change_note) <= 300),
  published_by uuid references auth.users (id) on delete set null default auth.uid(),
  published_at timestamptz not null default now(),
  unique (job_description_id, version),
  unique (company_id, id),
  foreign key (company_id, job_description_id) references public.job_descriptions (company_id, id) on delete cascade
);

create function app.job_description_versions_number()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if app.is_client_context() and not app.company_has_feature(new.company_id, 'job_descriptions') then
    raise exception 'feature_not_in_plan:job_descriptions' using errcode = 'P0001';
  end if;
  perform 1 from public.job_descriptions where id = new.job_description_id for update;
  select coalesce(max(version), 0) + 1 into new.version
  from public.job_description_versions where job_description_id = new.job_description_id;
  new.published_by := coalesce(auth.uid(), new.published_by);
  new.published_at := now();
  update public.job_descriptions set updated_at = now() where id = new.job_description_id;
  return new;
end;
$$;
create trigger job_description_versions_number before insert on public.job_description_versions
  for each row execute function app.job_description_versions_number();
create trigger job_description_versions_immutable before update or delete on public.job_description_versions
  for each row execute function app.block_mutation();

alter table public.employees
  add column job_description_id uuid,
  add constraint employees_job_description_fk foreign key (company_id, job_description_id)
    references public.job_descriptions (company_id, id);

alter table public.employee_history drop constraint employee_history_event_check;
alter table public.employee_history add constraint employee_history_event_check check (event in (
  'added', 'status_changed', 'job_title_changed', 'branch_changed', 'manager_changed',
  'employment_type_changed', 'details_updated', 'private_details_updated',
  'document_added', 'document_archived', 'portal_linked',
  'job_description_changed', 'job_description_acknowledged', 'contract_signed'));

create table public.job_description_acknowledgements (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null,
  employee_id uuid not null,
  version_id uuid not null,
  user_id uuid not null references auth.users (id),
  user_agent text check (user_agent is null or char_length(user_agent) <= 500),
  acknowledged_at timestamptz not null default now(),
  unique (employee_id, version_id),
  foreign key (company_id, employee_id) references public.employees (company_id, id) on delete restrict,
  foreign key (company_id, version_id) references public.job_description_versions (company_id, id) on delete restrict
);
create trigger job_description_acknowledgements_immutable before update or delete on public.job_description_acknowledgements
  for each row execute function app.block_mutation();

-- Set exactly which staff have this job description.
create function public.assign_job_description(p_job_description uuid, p_employee_ids uuid[])
returns int
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.job_descriptions;
  e record;
  v_count int := 0;
begin
  select * into v from public.job_descriptions where id = p_job_description;
  if v.id is null or not app.has_permission_anywhere(v.company_id, 'job_descriptions.manage') then
    raise exception 'You don''t have access to this job description' using errcode = '42501';
  end if;
  if not app.company_has_feature(v.company_id, 'job_descriptions') then
    raise exception 'feature_not_in_plan:job_descriptions' using errcode = 'P0001';
  end if;
  for e in
    select id, job_description_id from public.employees
    where company_id = v.company_id
      and ((id = any (coalesce(p_employee_ids, '{}')) and job_description_id is distinct from v.id)
           or (job_description_id = v.id and not (id = any (coalesce(p_employee_ids, '{}')))))
  loop
    if not app.has_staff_permission(v.company_id, e.id, 'job_descriptions.manage') then
      raise exception 'You don''t have access to this staff record' using errcode = '42501';
    end if;
    update public.employees
    set job_description_id = case when e.id = any (coalesce(p_employee_ids, '{}')) then v.id else null end
    where id = e.id;
    insert into public.employee_history (company_id, employee_id, event, details)
    values (v.company_id, e.id, 'job_description_changed', jsonb_build_object(
      'to', case when e.id = any (coalesce(p_employee_ids, '{}')) then v.title else null end));
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- A staff member confirms they have read the current version of their job description.
create function public.acknowledge_job_description(p_version uuid, p_user_agent text default null)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.job_description_versions;
  v_emp public.employees;
begin
  select * into v from public.job_description_versions where id = p_version;
  if v.id is null then
    raise exception 'not_found' using errcode = '22023';
  end if;
  select e.* into v_emp from public.employees e
  where e.company_id = v.company_id
    and e.job_description_id = v.job_description_id
    and app.is_own_staff_record(e.company_id, e.id);
  if v_emp.id is null then
    raise exception 'You don''t have access to this job description' using errcode = '42501';
  end if;
  if v.version <> (select max(version) from public.job_description_versions where job_description_id = v.job_description_id) then
    raise exception 'job_description_changed' using errcode = '22023';
  end if;
  insert into public.job_description_acknowledgements (company_id, employee_id, version_id, user_id, user_agent)
  values (v.company_id, v_emp.id, v.id, auth.uid(), left(p_user_agent, 500))
  on conflict (employee_id, version_id) do nothing;
  if found then
    insert into public.employee_history (company_id, employee_id, event, details)
    values (v.company_id, v_emp.id, 'job_description_acknowledged', jsonb_build_object('version', v.version));
  end if;
end;
$$;

revoke all on function public.assign_job_description(uuid, uuid[]) from public, anon;
revoke all on function public.acknowledge_job_description(uuid, text) from public, anon;
grant execute on function public.assign_job_description(uuid, uuid[]) to authenticated;
grant execute on function public.acknowledge_job_description(uuid, text) to authenticated;

-- Record signed contracts in the staff member's history.
create function app.contract_signatures_history()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.party = 'staff' then
    insert into public.employee_history (company_id, employee_id, event, details)
    select c.company_id, c.employee_id, 'contract_signed', jsonb_build_object('name', c.title)
    from public.contracts c where c.id = new.contract_id;
  end if;
  return null;
end;
$$;
create trigger contract_signatures_history after insert on public.contract_signatures
  for each row execute function app.contract_signatures_history();

-- ---------------------------------------------------------------------------
-- 8. Row security and privileges
-- ---------------------------------------------------------------------------
create trigger set_updated_at before update on public.contract_templates
  for each row execute function app.set_updated_at();
create trigger set_updated_at before update on public.contracts
  for each row execute function app.set_updated_at();
create trigger set_updated_at before update on public.job_descriptions
  for each row execute function app.set_updated_at();
create trigger contract_events_append_only before update or delete on public.contract_events
  for each row execute function app.block_mutation();
create trigger contract_signatures_append_only before update or delete on public.contract_signatures
  for each row execute function app.block_mutation();

do $$
declare
  t text;
begin
  foreach t in array array['contract_templates', 'contracts', 'contract_events', 'contract_signatures',
                           'contract_signing_codes', 'job_descriptions', 'job_description_versions',
                           'job_description_acknowledgements'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on table public.%I from anon, authenticated', t);
    execute format('grant all on table public.%I to service_role', t);
  end loop;
  foreach t in array array['contract_templates', 'contracts', 'contract_signing_codes', 'job_descriptions'] loop
    execute format('create trigger prevent_company_change before update on public.%I
                    for each row execute function app.prevent_company_change()', t);
  end loop;
  foreach t in array array['contract_templates', 'contracts', 'job_descriptions'] loop
    execute format('create trigger audit after insert or update or delete on public.%I
                    for each row execute function app.audit_row()', t);
  end loop;
end;
$$;

-- Templates: anyone who prepares contracts reads them; company-wide holders write them.
grant select on public.contract_templates to authenticated;
grant insert (company_id, kind, name, body, starter_key) on public.contract_templates to authenticated;
grant update (name, body, archived_at) on public.contract_templates to authenticated;
create policy contract_templates_select on public.contract_templates for select to authenticated
  using (app.has_permission_anywhere(company_id, 'contracts.manage'));
create policy contract_templates_insert on public.contract_templates for insert to authenticated
  with check (app.has_company_permission(company_id, 'contracts.manage')
              and app.company_has_feature(company_id, 'digital_contracts'));
create policy contract_templates_update on public.contract_templates for update to authenticated
  using (app.has_company_permission(company_id, 'contracts.manage'))
  with check (app.has_company_permission(company_id, 'contracts.manage'));

-- Contracts.
grant select on public.contracts to authenticated;
grant insert (company_id, employee_id, template_id, kind, title, body, amends_id) on public.contracts to authenticated;
grant update (title, body) on public.contracts to authenticated;
create policy contracts_select on public.contracts for select to authenticated
  using (app.can_view_contract(company_id, employee_id, status));
create policy contracts_insert on public.contracts for insert to authenticated
  with check (app.has_staff_permission(company_id, employee_id, 'contracts.manage'));
create policy contracts_update on public.contracts for update to authenticated
  using (status = 'draft' and app.has_staff_permission(company_id, employee_id, 'contracts.manage'))
  with check (status = 'draft' and app.has_staff_permission(company_id, employee_id, 'contracts.manage'));

grant select on public.contract_events to authenticated;
create policy contract_events_select on public.contract_events for select to authenticated
  using (exists (
    select 1 from public.contracts c
    where c.company_id = contract_events.company_id and c.id = contract_events.contract_id
      and app.can_view_contract(c.company_id, c.employee_id, c.status)
  ));

grant select on public.contract_signatures to authenticated;
create policy contract_signatures_select on public.contract_signatures for select to authenticated
  using (exists (
    select 1 from public.contracts c
    where c.company_id = contract_signatures.company_id and c.id = contract_signatures.contract_id
      and app.can_view_contract(c.company_id, c.employee_id, c.status)
  ));
-- contract_signing_codes: no client access at all (service role only).
create policy contract_signing_codes_none on public.contract_signing_codes for select to authenticated
  using (false);

-- Job descriptions: people who manage them or can view staff, and staff with that job description.
create function app.can_view_job_description(p_company uuid, p_job_description uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select app.has_permission_anywhere(p_company, 'job_descriptions.manage')
    or app.has_permission_anywhere(p_company, 'staff.view')
    or exists (
      select 1 from public.employees e
      where e.company_id = p_company and e.job_description_id = p_job_description
        and app.is_own_staff_record(e.company_id, e.id)
    );
$$;
revoke all on function app.can_view_job_description(uuid, uuid) from public, anon;
grant execute on function app.can_view_job_description(uuid, uuid) to authenticated, service_role;

grant select on public.job_descriptions to authenticated;
grant insert (company_id, title) on public.job_descriptions to authenticated;
grant update (title, archived_at) on public.job_descriptions to authenticated;
create policy job_descriptions_select on public.job_descriptions for select to authenticated
  using (app.can_view_job_description(company_id, id));
create policy job_descriptions_insert on public.job_descriptions for insert to authenticated
  with check (app.has_company_permission(company_id, 'job_descriptions.manage')
              and app.company_has_feature(company_id, 'job_descriptions'));
create policy job_descriptions_update on public.job_descriptions for update to authenticated
  using (app.has_company_permission(company_id, 'job_descriptions.manage'))
  with check (app.has_company_permission(company_id, 'job_descriptions.manage'));

grant select on public.job_description_versions to authenticated;
grant insert (company_id, job_description_id, body, change_note) on public.job_description_versions to authenticated;
create policy job_description_versions_select on public.job_description_versions for select to authenticated
  using (app.can_view_job_description(company_id, job_description_id));
create policy job_description_versions_insert on public.job_description_versions for insert to authenticated
  with check (app.has_company_permission(company_id, 'job_descriptions.manage'));

grant select on public.job_description_acknowledgements to authenticated;
create policy job_description_acknowledgements_select on public.job_description_acknowledgements
  for select to authenticated
  using (
    app.is_own_staff_record(company_id, employee_id)
    or app.has_staff_permission(company_id, employee_id, 'staff.view')
    or app.has_staff_permission(company_id, employee_id, 'job_descriptions.manage')
  );

-- employees.job_description_id is readable with the rest of the record and
-- changed only through assign_job_description().
grant select (job_description_id) on public.employees to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Private storage for final signed documents (where Supabase Storage exists)
-- ---------------------------------------------------------------------------
do $$
begin
  if exists (select 1 from pg_namespace where nspname = 'storage') then
    insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    values ('contracts', 'contracts', false, 10485760, array['application/pdf'])
    on conflict (id) do nothing;

    -- Files are written by the server (service role) only. Readers: whoever can see the contract.
    execute $p$
      create policy contracts_files_select on storage.objects for select to authenticated
      using (
        bucket_id = 'contracts'
        and exists (
          select 1 from public.contracts c
          where c.company_id::text = (storage.foldername(name))[1]
            and c.id::text = (storage.foldername(name))[2]
            and app.can_view_contract(c.company_id, c.employee_id, c.status)
        )
      )
    $p$;
  end if;
end;
$$;
