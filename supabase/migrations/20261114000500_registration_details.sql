-- =============================================================================
-- WOHKAH · Migration 15: registration details (product owner, 2026-11-14)
--
-- The sign-up form now collects first and last name, a phone number (E.164),
-- how the person heard about WOHKAH, acceptance of the Terms of Use and
-- Privacy Policy, and optional marketing consent.
--
-- * public.profiles gains first_name and last_name (full_name is still kept,
--   as "First Last", for every existing screen). The phone goes into the
--   existing profiles.phone column, only if it is a valid E.164 number.
-- * public.user_registrations holds acquisition source, terms acceptance and
--   marketing consent. Only the person themselves can read it (profiles are
--   visible to colleagues; these answers are not). Clients can't write it:
--   the sign-up trigger fills it from the details sent with sign-up.
-- * Timestamps come from the database clock (now()), not from the browser.
--
-- Password hashing, email confirmation and sessions are unchanged (Supabase
-- Auth). Trial and subscription logic is unchanged.
--
-- Rollback: drop table public.user_registrations; drop the two profile
-- columns; restore app.handle_new_user() from migration 6.
-- =============================================================================

alter table public.profiles
  add column first_name text check (first_name is null or char_length(first_name) <= 60),
  add column last_name text check (last_name is null or char_length(last_name) <= 60);

create table public.user_registrations (
  user_id uuid primary key references auth.users (id) on delete cascade,
  acquisition_source text check (acquisition_source in (
    'instagram', 'facebook', 'tiktok', 'linkedin', 'google_search', 'youtube',
    'whatsapp', 'referral', 'business_community', 'other'
  )),
  acquisition_detail text check (acquisition_detail is null or char_length(acquisition_detail) <= 100),
  terms_accepted_at timestamptz,
  terms_version text check (terms_version is null or char_length(terms_version) <= 40),
  marketing_consent boolean not null default false,
  marketing_consent_at timestamptz,
  created_at timestamptz not null default now()
);
comment on table public.user_registrations is
  'Answers given at sign-up: acquisition channel, terms acceptance, marketing consent. Owner-readable only.';
create index user_registrations_source_idx on public.user_registrations (acquisition_source);

alter table public.user_registrations enable row level security;
revoke all on public.user_registrations from anon, authenticated;
grant select on public.user_registrations to authenticated;
create policy user_registrations_select_own on public.user_registrations
  for select to authenticated using (user_id = (select auth.uid()));

-- Profile and registration rows for every new user. Every value is checked
-- here because sign-up details can be sent by any client, not just our form.
create or replace function app.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_first text := left(nullif(trim(v_meta ->> 'first_name'), ''), 60);
  v_last text := left(nullif(trim(v_meta ->> 'last_name'), ''), 60);
  v_full text := left(coalesce(
    nullif(trim(v_meta ->> 'full_name'), ''),
    nullif(trim(concat_ws(' ', v_first, v_last)), ''),
    ''), 120);
  v_phone text := nullif(trim(v_meta ->> 'phone'), '');
  v_source text := nullif(v_meta ->> 'acquisition_source', '');
  v_terms boolean := coalesce(v_meta ->> 'terms_accepted', '') = 'true';
  v_marketing boolean := coalesce(v_meta ->> 'marketing_consent', '') = 'true';
begin
  if v_phone is not null and v_phone !~ '^\+[1-9][0-9]{6,14}$' then
    v_phone := null;
  end if;
  if v_source not in ('instagram', 'facebook', 'tiktok', 'linkedin', 'google_search', 'youtube',
                      'whatsapp', 'referral', 'business_community', 'other') then
    v_source := null;
  end if;

  insert into public.profiles (id, full_name, first_name, last_name, phone)
  values (new.id, v_full, v_first, v_last, v_phone)
  on conflict (id) do nothing;

  insert into public.user_registrations (
    user_id, acquisition_source, acquisition_detail, terms_accepted_at, terms_version,
    marketing_consent, marketing_consent_at
  ) values (
    new.id,
    v_source,
    case when v_source = 'other'
      then left(nullif(trim(v_meta ->> 'acquisition_detail'), ''), 100) end,
    case when v_terms then now() end,
    case when v_terms then left(nullif(trim(v_meta ->> 'terms_version'), ''), 40) end,
    v_marketing,
    case when v_marketing then now() end
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;
