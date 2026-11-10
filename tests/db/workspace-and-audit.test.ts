/**
 * Company creation, invitations, profiles, audit logging, rate limiting and
 * platform admin access.
 */
import { afterAll, describe, expect, it } from "vitest";
import {
  addMember,
  asAdmin,
  asAnon,
  asService,
  asUser,
  createCompany,
  createUser,
  expectDbError,
  newToken,
  pool,
  uid,
} from "./helpers";

afterAll(() => pool.end());

describe("create_company", () => {
  it("requires a confirmed email address", async () => {
    const u = await createUser({ confirmed: false });
    await expectDbError(
      asUser({ userId: u.id }, (db) => db.query("select public.create_company('X Ltd', $1)", [`x-${uid()}`])),
      /email_not_confirmed/,
    );
  });

  it("rejects reserved and duplicate slugs", async () => {
    const u = await createUser();
    await expectDbError(
      asUser({ userId: u.id }, (db) => db.query("select public.create_company('Admin', 'admin')")),
      /slug_reserved/,
    );
    const c = await createCompany(u.id);
    await expectDbError(
      asUser({ userId: u.id }, (db) => db.query("select public.create_company('Dup', $1)", [c.slug])),
      /slug_taken/,
    );
  });

  it("cannot be called by anonymous visitors", async () => {
    await expectDbError(
      asAnon((db) => db.query("select public.create_company('Anon', $1)", [`a-${uid()}`])),
      /permission denied/,
    );
  });
});

describe("invitations", () => {
  async function invite(companyId: string, inviterId: string, email: string) {
    const { token, hash } = newToken();
    await asUser({ userId: inviterId }, (db) =>
      db.query(
        "insert into public.company_invitations (company_id, email, token_hash) values ($1, $2, $3)",
        [companyId, email, hash],
      ),
    );
    return token;
  }

  it("can be previewed by token without signing in", async () => {
    const owner = await createUser();
    const company = await createCompany(owner.id, "Preview Ltd");
    const token = await invite(company.id, owner.id, "guest@test.wohkah.local");
    const rows = await asAnon(async (db) =>
      (await db.query("select * from public.invitation_preview($1)", [token])).rows,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].company_name).toBe("Preview Ltd");
    const none = await asAnon(async (db) =>
      (await db.query("select * from public.invitation_preview('wrong-token')")).rows,
    );
    expect(none).toEqual([]);
  });

  it("can only be accepted by the invited email address, and only once", async () => {
    const owner = await createUser();
    const company = await createCompany(owner.id);
    const invitee = await createUser();
    const stranger = await createUser();
    const token = await invite(company.id, owner.id, invitee.email);

    await expectDbError(
      asUser({ userId: stranger.id }, (db) => db.query("select public.accept_invitation($1)", [token])),
      /invitation_email_mismatch/,
    );
    const slug = await asUser({ userId: invitee.id }, async (db) =>
      (await db.query("select public.accept_invitation($1) as s", [token])).rows[0]!.s,
    );
    expect(slug).toBe(company.slug);
    await expectDbError(
      asUser({ userId: invitee.id }, (db) => db.query("select public.accept_invitation($1)", [token])),
      /invitation_invalid/,
    );
    // Default role is Employee.
    const ctx = await asUser({ userId: invitee.id }, async (db) =>
      (await db.query("select public.workspace_context($1) as c", [company.slug])).rows[0]!.c,
    );
    expect(ctx.roles.map((r: { system_key: string }) => r.system_key)).toEqual(["employee"]);
  });

  it("cannot be accepted after it expires or is revoked", async () => {
    const owner = await createUser();
    const company = await createCompany(owner.id);
    const invitee = await createUser();
    const token = await invite(company.id, owner.id, invitee.email);
    await asAdmin((db) =>
      db.query(
        "update public.company_invitations set expires_at = now() - interval '1 minute' where company_id = $1",
        [company.id],
      ),
    );
    await expectDbError(
      asUser({ userId: invitee.id }, (db) => db.query("select public.accept_invitation($1)", [token])),
      /invitation_invalid/,
    );

    const invitee2 = await createUser();
    const token2 = await invite(company.id, owner.id, invitee2.email);
    await asUser({ userId: owner.id }, (db) =>
      db.query(
        "update public.company_invitations set status = 'revoked' where company_id = $1 and email = $2",
        [company.id, invitee2.email],
      ),
    );
    await expectDbError(
      asUser({ userId: invitee2.id }, (db) => db.query("select public.accept_invitation($1)", [token2])),
      /invitation_invalid/,
    );
  });
});

describe("profiles", () => {
  it("are visible to co-workers but not to strangers", async () => {
    const owner = await createUser({ fullName: "Ada Owner" });
    const company = await createCompany(owner.id);
    const colleague = await addMember(company, owner.id);
    const stranger = await createUser();

    const seen = await asUser({ userId: colleague.id }, async (db) =>
      (await db.query("select full_name from public.profiles where id = $1", [owner.id])).rows,
    );
    expect(seen).toEqual([{ full_name: "Ada Owner" }]);

    const hidden = await asUser({ userId: stranger.id }, async (db) =>
      (await db.query("select full_name from public.profiles where id = $1", [owner.id])).rows,
    );
    expect(hidden).toEqual([]);
  });

  it("can only be edited by their owner", async () => {
    const a = await createUser();
    const company = await createCompany(a.id);
    const b = await addMember(company, a.id);
    const r = await asUser({ userId: b.id }, (db) =>
      db.query("update public.profiles set full_name = 'Changed' where id = $1", [a.id]),
    );
    expect(r.rowCount).toBe(0);
  });
});

describe("audit log", () => {
  it("records who changed what, and is readable only with audit.view in that company", async () => {
    const owner = await createUser();
    const company = await createCompany(owner.id);
    const employee = await addMember(company, owner.id);
    const outsider = await createUser();
    await createCompany(outsider.id);

    await asUser({ userId: owner.id }, (db) =>
      db.query("insert into public.departments (company_id, name) values ($1, 'Finance')", [
        company.id,
      ]),
    );

    const logs = await asUser({ userId: owner.id }, async (db) =>
      (
        await db.query(
          `select actor_user_id, action, changes from public.audit_logs
           where company_id = $1 and action = 'departments.insert'`,
          [company.id],
        )
      ).rows,
    );
    expect(logs).toHaveLength(1);
    expect(logs[0].actor_user_id).toBe(owner.id);
    expect(logs[0].changes.name).toBe("Finance");

    for (const user of [employee, outsider]) {
      const rows = await asUser({ userId: user.id }, async (db) =>
        (await db.query("select id from public.audit_logs where company_id = $1", [company.id])).rows,
      );
      expect(rows).toEqual([]);
    }
  });

  it("is append-only, even for the database owner and the service role", async () => {
    await expectDbError(
      asAdmin((db) => db.query("update public.audit_logs set action = 'tampered'")),
      /append-only/,
    );
    await expectDbError(asAdmin((db) => db.query("delete from public.audit_logs")), /append-only/);
    await expectDbError(
      asService((db) => db.query("delete from public.audit_logs")),
      /append-only/,
    );
  });

  it("cannot be written directly by users", async () => {
    const u = await createUser();
    const company = await createCompany(u.id);
    await expectDbError(
      asUser({ userId: u.id }, (db) =>
        db.query(
          `insert into public.audit_logs (company_id, actor_type, action, entity_type)
           values ($1, 'user', 'fake', 'fake')`,
          [company.id],
        ),
      ),
      /permission denied/,
    );
  });
});

describe("rate limiting", () => {
  it("counts attempts per window and can only be used by the server", async () => {
    const key = `test:${uid()}`;
    const hit = () =>
      asService(async (db) =>
        (await db.query("select * from public.rate_limit_hit($1, 2, 60)", [key])).rows[0]!,
      );
    expect((await hit()).allowed).toBe(true);
    expect((await hit()).allowed).toBe(true);
    const third = await hit();
    expect(third.allowed).toBe(false);
    expect(third.remaining).toBe(0);

    const u = await createUser();
    await expectDbError(
      asUser({ userId: u.id }, (db) => db.query("select * from public.rate_limit_hit('x', 1, 60)")),
      /permission denied/,
    );
  });
});

describe("platform admins", () => {
  it("see tenant data only with a multi-factor (aal2) session", async () => {
    const owner = await createUser();
    const company = await createCompany(owner.id);
    const admin = await createUser();
    await asAdmin((db) =>
      db.query("insert into public.platform_admins (user_id, role) values ($1, 'super_admin')", [
        admin.id,
      ]),
    );
    const visible = (aal: "aal1" | "aal2") =>
      asUser({ userId: admin.id, aal }, async (db) =>
        (await db.query("select id from public.companies where id = $1", [company.id])).rowCount,
      );
    expect(await visible("aal1")).toBe(0);
    expect(await visible("aal2")).toBe(1);
  });

  it("cannot be created by company owners", async () => {
    const owner = await createUser();
    await createCompany(owner.id);
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("insert into public.platform_admins (user_id, role) values ($1, 'super_admin')", [
          owner.id,
        ]),
      ),
      /permission denied/,
    );
  });
});
