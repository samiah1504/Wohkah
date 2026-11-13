/**
 * Typed mirror of the `permissions` table (seeded by migrations).
 * tests/db/catalog.test.ts fails if this list and the database drift apart.
 *
 * The UI uses can() only to HIDE what the user can't do. The database (RLS)
 * is what actually forbids it.
 */
export const PERMISSIONS = [
  "company.settings.manage",
  "branches.manage",
  "holidays.manage",
  "members.view",
  "members.invite",
  "members.manage",
  "roles.view",
  "roles.assign",
  "roles.manage",
  "audit.view",
  "subscription.view",
  "subscription.manage",
  "support_access.manage",
  "staff.view",
  "staff.manage",
  "work_locations.manage",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export function isPermission(value: string): value is Permission {
  return (PERMISSIONS as readonly string[]).includes(value);
}

export class ForbiddenError extends Error {
  constructor(public readonly permission: Permission) {
    super("You don't have permission to do that.");
    this.name = "ForbiddenError";
  }
}

export type HasPermissions = { permissions: ReadonlySet<Permission> };

export function can(ctx: HasPermissions, permission: Permission): boolean {
  return ctx.permissions.has(permission);
}

export function canAny(ctx: HasPermissions, permissions: readonly Permission[]): boolean {
  return permissions.some((p) => ctx.permissions.has(p));
}

/** Throws ForbiddenError: use at the top of Server Actions for a clear message. */
export function requirePermission(ctx: HasPermissions, permission: Permission): void {
  if (!can(ctx, permission)) throw new ForbiddenError(permission);
}
