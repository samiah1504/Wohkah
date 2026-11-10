-- =============================================================================
-- WOHKAH Phase 1 · Migration 1: foundation
-- Private `app` schema for security helpers (never exposed through the API),
-- shared enums and generic triggers.
--
-- Rollback: drop schema app cascade; drop the enum types below.
-- (Forward-only in production; rollback is for development databases only.)
-- =============================================================================

create extension if not exists citext with schema extensions;

-- Private schema: not in the PostgREST exposed schemas, so its functions can't be
-- called directly over the API. RLS policies call them.
create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to authenticated, service_role;

-- Functions are not executable by PUBLIC (which includes `anon`) unless granted.
alter default privileges in schema app revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from public;

-- ---------------------------------------------------------------------------
-- Enums (stable state machines)
-- ---------------------------------------------------------------------------
create type public.company_status as enum ('active', 'suspended', 'closed');
create type public.member_status as enum ('active', 'suspended', 'removed');
create type public.role_scope as enum ('company', 'department', 'branch');
create type public.subscription_status as enum (
  'trialing', 'active', 'past_due', 'grace', 'canceled', 'expired'
);
create type public.billing_interval as enum ('monthly', 'annual');
create type public.invitation_status as enum ('pending', 'accepted', 'revoked');

-- ---------------------------------------------------------------------------
-- Generic triggers
-- ---------------------------------------------------------------------------

-- Maintain updated_at.
create function app.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- A row can never move to another company. Combined with RLS WITH CHECK this
-- closes "re-parent a row into a tenant I also belong to" tricks.
create function app.prevent_company_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.company_id is distinct from old.company_id then
    raise exception 'company_id is immutable' using errcode = '42501';
  end if;
  return new;
end;
$$;

-- Append-only tables (audit and security logs): block UPDATE and DELETE for
-- everyone, including the service role.
create function app.block_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '42501';
end;
$$;

-- True when the current statement comes directly from an API user (the
-- `authenticated` role), as opposed to a trusted SECURITY DEFINER function,
-- a migration or the service role. Used by triggers that enforce rules on
-- direct client writes only.
create function app.is_client_context()
returns boolean
language sql
stable
set search_path = ''
as $$
  select current_user = 'authenticated';
$$;
