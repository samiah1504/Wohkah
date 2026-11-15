-- =============================================================================
-- Navigation redesign: a permission for Salary Management, so the section is
-- shown only to people the owner chooses (managers don't get it
-- automatically). Salaries themselves arrive in Phase 5 and use this key.
--
-- Rollback: delete from public.role_permissions / role_templates / permissions
-- where the key is 'salaries.view'.
-- =============================================================================
insert into public.permissions (key, module, description, is_sensitive, sort_order) values
  ('salaries.view', 'salaries', 'See and manage staff salaries and salary slips', true, 400);

insert into public.role_templates (system_key, permission_key) values ('owner', 'salaries.view');

insert into public.role_permissions (company_id, role_id, permission_key)
select r.company_id, r.id, 'salaries.view'
from public.roles r
where r.system_key = 'owner'
on conflict do nothing;
