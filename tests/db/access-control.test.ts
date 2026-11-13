/**
 * Roles, permissions, privilege escalation, plan limits and the owner rule.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addMember,
  asAdmin,
  asUser,
  createCompany,
  createUser,
  expectDbError,
  newToken,
  pool,
  roleId,
  setPlan,
  type Company,
} from "./helpers";

afterAll(() => pool.end());

describe("permissions", () => {
  let owner: { id: string };
  let company: Company;
  let employee: { id: string; memberId: string };

  beforeAll(async () => {
    owner = await createUser();
    company = await createCompany(owner.id);
    employee = await addMember(company, owner.id, ["employee"]);
  });

  it("seeds the six system roles and a Free subscription on company creation", async () => {
    const out = await asUser({ userId: owner.id }, async (db) => {
      const roles = await db.query<{ system_key: string }>(
        "select system_key from public.roles where company_id = $1 order by system_key",
        [company.id],
      );
      const plan = await db.query<{ code: string }>(
        `select p.code from public.company_subscriptions s
         join public.subscription_plans p on p.id = s.plan_id where s.company_id = $1`,
        [company.id],
      );
      return { roles: roles.rows.map((r) => r.system_key), plan: plan.rows[0]?.code };
    });
    expect(out.roles).toEqual(["accountant", "employee", "hr_admin", "ops_manager", "owner"]);
    expect(out.plan).toBe("free");
  });

  it("lets an employee read their workspace but not administer it", async () => {
    await asUser({ userId: employee.id }, async (db) => {
      const r = await db.query("select id from public.companies where id = $1", [company.id]);
      expect(r.rowCount).toBe(1);
    });
    await expectDbError(
      asUser({ userId: employee.id }, (db) =>
        db.query("insert into public.branches (company_id, name) values ($1, 'X')", [company.id]),
      ),
      /row-level security/,
    );
    const upd = await asUser({ userId: employee.id }, (db) =>
      db.query("update public.companies set name = 'Mine now' where id = $1", [company.id]),
    );
    expect(upd.rowCount).toBe(0);
  });

  it("does not let clients change protected columns such as slug or status", async () => {
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("update public.companies set status = 'active', slug = 'stolen' where id = $1", [
          company.id,
        ]),
      ),
      /permission denied/,
    );
  });

  it("never exposes invitation token hashes to clients", async () => {
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("select token_hash from public.company_invitations"),
      ),
      /permission denied/,
    );
  });

  it("does not let a member change their own membership status", async () => {
    await expectDbError(
      asUser({ userId: owner.id }, async (db) => {
        const me = await db.query<{ id: string }>(
          "select id from public.company_members where company_id = $1 and user_id = $2",
          [company.id, owner.id],
        );
        await db.query("update public.company_members set status = 'suspended' where id = $1", [
          me.rows[0]!.id,
        ]);
      }),
      /own membership status/,
    );
  });
});

describe("privilege escalation is impossible", () => {
  let owner: { id: string };
  let company: Company;
  let hr: { id: string; memberId: string };
  let employee: { id: string; memberId: string };

  beforeAll(async () => {
    owner = await createUser();
    company = await createCompany(owner.id);
    await setPlan(company.id, "growth"); // allows several admins and custom roles
    hr = await addMember(company, owner.id, ["hr_admin"]);
    employee = await addMember(company, owner.id, ["employee"]);
  });

  it("lets an HR Administrator assign roles within their own permissions", async () => {
    // A custom role with members.view only (a permission the Staff Manager holds).
    const viewerRole = await asAdmin(async (db) => {
      const r = await db.query<{ id: string }>(
        "insert into public.roles (company_id, name) values ($1, 'Viewer') returning id",
        [company.id],
      );
      await db.query(
        "insert into public.role_permissions (company_id, role_id, permission_key) values ($1, $2, 'members.view')",
        [company.id, r.rows[0]!.id],
      );
      return r.rows[0]!.id;
    });
    await asUser({ userId: hr.id }, (db) =>
      db.query(
        "insert into public.member_roles (company_id, member_id, role_id) values ($1, $2, $3)",
        [company.id, employee.memberId, viewerRole],
      ),
    );
  });

  it("stops an HR Administrator granting a role with permissions they lack", async () => {
    const accountant = await roleId(company.id, "accountant"); // has subscription.view
    await expectDbError(
      asUser({ userId: hr.id }, (db) =>
        db.query(
          "insert into public.member_roles (company_id, member_id, role_id) values ($1, $2, $3)",
          [company.id, employee.memberId, accountant],
        ),
      ),
      /roles whose permissions you hold/,
    );
  });

  it("stops a non-owner granting the Owner role, including to themselves", async () => {
    const ownerRole = await roleId(company.id, "owner");
    await expectDbError(
      asUser({ userId: hr.id }, (db) =>
        db.query(
          "insert into public.member_roles (company_id, member_id, role_id) values ($1, $2, $3)",
          [company.id, hr.memberId, ownerRole],
        ),
      ),
      /roles whose permissions you hold/,
    );
  });

  it("stops a non-owner inviting someone as Owner", async () => {
    const ownerRole = await roleId(company.id, "owner");
    await expectDbError(
      asUser({ userId: hr.id }, (db) =>
        db.query(
          `insert into public.company_invitations (company_id, email, role_ids, token_hash)
           values ($1, 'boss@test.wohkah.local', $2, $3)`,
          [company.id, [ownerRole], newToken().hash],
        ),
      ),
      /roles whose permissions you hold/,
    );
  });

  it("stops a non-owner suspending an owner", async () => {
    const ownerMember = await asAdmin(
      async (db) =>
        (
          await db.query<{ id: string }>(
            "select id from public.company_members where company_id = $1 and user_id = $2",
            [company.id, owner.id],
          )
        ).rows[0]!.id,
    );
    await expectDbError(
      asUser({ userId: hr.id }, (db) =>
        db.query("update public.company_members set status = 'suspended' where id = $1", [
          ownerMember,
        ]),
      ),
      /Only an owner/,
    );
  });

  it("stops anyone adding permissions they do not hold to a custom role", async () => {
    // Owner creates a custom role (Growth plan allows it) and gives HR roles.manage via it.
    const custom = await asUser({ userId: owner.id }, async (db) => {
      const r = await db.query<{ id: string }>(
        "insert into public.roles (company_id, name) values ($1, 'Role editor') returning id",
        [company.id],
      );
      const id = r.rows[0]!.id;
      for (const key of ["roles.manage", "members.view"]) {
        await db.query(
          "insert into public.role_permissions (company_id, role_id, permission_key) values ($1, $2, $3)",
          [company.id, id, key],
        );
      }
      return id;
    });
    // roles.manage is not in HR's permissions, so HR can't assign this role either.
    await expectDbError(
      asUser({ userId: hr.id }, (db) =>
        db.query(
          "insert into public.member_roles (company_id, member_id, role_id) values ($1, $2, $3)",
          [company.id, hr.memberId, custom],
        ),
      ),
      /roles whose permissions you hold/,
    );
    // Owner assigns it to HR; HR still can't add audit.view (which HR lacks) to any role.
    await asUser({ userId: owner.id }, (db) =>
      db.query(
        "insert into public.member_roles (company_id, member_id, role_id) values ($1, $2, $3)",
        [company.id, hr.memberId, custom],
      ),
    );
    await expectDbError(
      asUser({ userId: hr.id }, (db) =>
        db.query(
          "insert into public.role_permissions (company_id, role_id, permission_key) values ($1, $2, 'audit.view')",
          [company.id, custom],
        ),
      ),
      /permissions you hold yourself/,
    );
  });

  it("never allows the Owner role's permissions to change", async () => {
    const ownerRole = await roleId(company.id, "owner");
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("delete from public.role_permissions where role_id = $1", [ownerRole]),
      ),
      /Owner role's permissions cannot be changed/,
    );
  });

  it("never allows system roles to be deleted", async () => {
    const accountant = await roleId(company.id, "accountant");
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("delete from public.roles where id = $1", [accountant]),
      ),
      /System roles cannot be deleted/,
    );
  });
});

describe("the last owner rule", () => {
  it("prevents removing the only owner's Owner role", async () => {
    const owner = await createUser();
    const company = await createCompany(owner.id);
    const ownerRole = await roleId(company.id, "owner");
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("delete from public.member_roles where role_id = $1", [ownerRole]),
      ),
      /at least one active owner/,
    );
  });

  it("allows transferring ownership within one transaction", async () => {
    const owner = await createUser();
    const company = await createCompany(owner.id);
    await setPlan(company.id, "growth");
    const next = await addMember(company, owner.id, ["employee"]);
    const ownerRole = await roleId(company.id, "owner");
    await asUser({ userId: owner.id }, async (db) => {
      await db.query(
        "insert into public.member_roles (company_id, member_id, role_id) values ($1, $2, $3)",
        [company.id, next.memberId, ownerRole],
      );
      await db.query(`delete from public.member_roles where role_id = $1 and member_id <> $2`, [
        ownerRole,
        next.memberId,
      ]);
    });
    const owners = await asAdmin(async (db) =>
      (
        await db.query<{ user_id: string }>(
          `select m.user_id from public.member_roles mr
           join public.company_members m on m.id = mr.member_id where mr.role_id = $1`,
          [ownerRole],
        )
      ).rows.map((r) => r.user_id),
    );
    expect(owners).toEqual([next.id]);
  });
});

describe("plan entitlements are enforced by the database", () => {
  it("Free plan allows one administrator only", async () => {
    const owner = await createUser();
    const company = await createCompany(owner.id);
    await expectDbError(addMember(company, owner.id, ["hr_admin"]), /plan_limit_exceeded:admins:1/);
    // Employees don't count as administrators.
    await addMember(company, owner.id, ["employee"]);
  });

  it("Free plan allows one branch; Business allows more", async () => {
    const owner = await createUser();
    const company = await createCompany(owner.id);
    const insertBranch = (name: string) =>
      asUser({ userId: owner.id }, (db) =>
        db.query("insert into public.branches (company_id, name) values ($1, $2)", [
          company.id,
          name,
        ]),
      );
    await insertBranch("Head office");
    await expectDbError(insertBranch("Abuja"), /plan_limit_exceeded:branches:1/);
    await setPlan(company.id, "business");
    await insertBranch("Abuja");
  });

  it("Free plan cannot create custom roles", async () => {
    const owner = await createUser();
    const company = await createCompany(owner.id);
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("insert into public.roles (company_id, name) values ($1, 'Supervisor')", [
          company.id,
        ]),
      ),
      /row-level security/,
    );
  });

  it("falls back to Free entitlements when a paid subscription expires", async () => {
    const owner = await createUser();
    const company = await createCompany(owner.id);
    await setPlan(company.id, "growth");
    const enabled = async () =>
      asUser({ userId: owner.id }, async (db) => {
        const r = await db.query("select public.workspace_context($1) as c", [company.slug]);
        return r.rows[0]!.c.features.custom_roles.enabled as boolean;
      });
    expect(await enabled()).toBe(true);
    await asAdmin((db) =>
      db.query("update public.company_subscriptions set status = 'expired' where company_id = $1", [
        company.id,
      ]),
    );
    expect(await enabled()).toBe(false);
  });
});
