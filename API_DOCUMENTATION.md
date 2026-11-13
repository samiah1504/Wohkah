# WOHKAH — API Documentation

WOHKAH has no public REST API yet. Its server interfaces are:

1. **Server Actions** used by the web app (`src/modules/*/server/actions.ts`).
2. **Route handlers** (`src/app/**/route.ts`).
3. **Database RPC functions** called through Supabase (PostgREST) with the user's own JWT.

Every one of them derives the user from the session and the workspace from the URL slug. None
accepts a company id or user id from the browser as a source of truth (ADR-0003).

## 1. Route handlers

| Route | Method | Auth | Purpose |
|---|---|---|---|
| `/auth/confirm` | GET | Public (link from email) | Completes email confirmation, password recovery and email change. Accepts `token_hash` + `type`, or `code` (PKCE). Redirects to a same-site `next` path only |

## 2. Server Actions

All return a `FormState` (`{ status, message?, fieldErrors?, values? }`) or redirect. Workspace
actions read the `slug` field, resolve the workspace server-side, check the permission, validate
with zod and write with the user's Supabase client, so RLS applies.

| Module | Action | Permission | Notes |
|---|---|---|---|
| identity | `login` | — | Rate-limited by IP and email; generic error on failure; redirects to MFA step when enrolled |
| identity | `register` | — | Rate-limited by IP; same response whether or not the email exists |
| identity | `requestPasswordReset` | — | Rate-limited; always the same message |
| identity | `resetPassword` | signed in | Also used for "change password" |
| identity | `signOut` | signed in | |
| identity | `verifyMfaLogin`, `startMfaEnrollment`, `confirmMfaEnrollment`, `disableMfa` | signed in | TOTP; disabling requires an aal2 session |
| identity | `updateProfile` | signed in | Own profile only |
| workspace | `createCompany` | signed in, confirmed email | Calls `create_company`; 5 per user per day |
| workspace | `updateCompanyProfile` | `company.settings.manage` | |
| workspace | `saveBranch`, `setBranchArchived` | `branches.manage` | Plan limit `branches` |
| workspace | `addHoliday`, `deleteHoliday` | `holidays.manage` | |
| access | `inviteMember` | `members.invite` | Only grantable roles; emails via Resend or returns a copyable link |
| access | `revokeInvitation` | `members.invite` | |
| access | `acceptInvitation` | signed in | Calls `accept_invitation` |
| access | `setMemberStatus` | `members.manage` | Not on yourself; owners only by owners |
| access | `setMemberRoles` | `roles.assign` | Adds before removing; escalation blocked by the database |
| access | `saveRole`, `setRolePermissions`, `deleteRole` | `roles.manage` + plan feature `custom_roles` | |

## 3. Database RPC functions (`public` schema)

| Function | Callable by | Security | Purpose |
|---|---|---|---|
| `create_company(p_name, p_slug, p_country_code?, p_timezone?, p_currency?, p_industry?, p_size_band?) → uuid` | authenticated | DEFINER | Company, owner membership, six system roles, Free subscription (one transaction) |
| `is_slug_available(p_slug) → boolean` | authenticated | DEFINER | Format, reserved words, uniqueness |
| `invitation_preview(p_token) → (company_name, company_slug, email, expires_at)` | anon, authenticated | DEFINER | Only for a valid, pending, unexpired token |
| `accept_invitation(p_token) → slug` | authenticated | DEFINER | Email must match the signed-in, confirmed user; single use |
| `workspace_context(p_slug) → jsonb` | authenticated | INVOKER (RLS) | Company, membership, roles, permissions, plan, features; `null` for non-members |
| `workspace_member_directory(p_company) → table` | authenticated | DEFINER | Members with emails; requires `members.view` |
| `rate_limit_hit(p_key, p_limit, p_window_seconds) → (allowed, remaining, reset_at)` | service role only | DEFINER | Fixed-window counter |

Errors raised for users use stable keys (`slug_taken`, `slug_reserved`, `invitation_invalid`,
`invitation_email_mismatch`, `email_not_confirmed`, `plan_limit_exceeded:<feature>:<limit>`) that
`src/lib/errors.ts` turns into messages.
