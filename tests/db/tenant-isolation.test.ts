/**
 * Master prompt PART 5 — tenant isolation, proven at the database level:
 *  1. Company A cannot read Company B records.
 *  2. Company A cannot modify Company B records.
 *  5. A user in several companies only acts within the workspace they select.
 *  6. Changing company identifiers in a request cannot bypass access control.
 * (3. documents/storage and 4. employee-private data are added with Phase 2.)
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addMember,
  asAdmin,
  asAnon,
  asUser,
  createCompany,
  createUser,
  expectDbError,
  newToken,
  pool,
  setPlan,
  type Company,
} from "./helpers";

afterAll(() => pool.end());

let ownerA: { id: string };
let ownerB: { id: string };
let companyA: Company;
let companyB: Company;
let deptB: string;
let branchB: string;

beforeAll(async () => {
  ownerA = await createUser();
  ownerB = await createUser();
  companyA = await createCompany(ownerA.id, "Alpha Ltd");
  companyB = await createCompany(ownerB.id, "Bravo Ltd");
  await setPlan(companyB.id, "growth");

  // Give Company B data in every Phase 1 tenant table.
  await asUser({ userId: ownerB.id }, async (db) => {
    deptB = (
      await db.query<{ id: string }>(
        "insert into public.departments (company_id, name) values ($1, 'Sales') returning id",
        [companyB.id],
      )
    ).rows[0]!.id;
    branchB = (
      await db.query<{ id: string }>(
        "insert into public.branches (company_id, name) values ($1, 'Lagos HQ') returning id",
        [companyB.id],
      )
    ).rows[0]!.id;
    await db.query(
      "insert into public.public_holidays (company_id, holiday_date, name) values ($1, '2027-01-01', 'New Year')",
      [companyB.id],
    );
  });
  await addMember(companyB, ownerB.id, ["employee"]);
  // A pending invitation and an audit trail now exist for B as well.
  await asUser({ userId: ownerB.id }, (db) =>
    db.query(
      `insert into public.company_invitations (company_id, email, token_hash)
       values ($1, 'pending@test.wohkah.local', $2)`,
      [companyB.id, newToken().hash],
    ),
  );
});

describe("1. Company A cannot read Company B records", () => {
  it("returns no Company B rows from ANY table with a company_id column", async () => {
    const tables = await asAdmin(async (db) =>
      (
        await db.query<{ table_name: string }>(
          `select distinct c.table_name
           from information_schema.columns c
           join information_schema.tables t
             on t.table_schema = c.table_schema and t.table_name = c.table_name
           where c.table_schema = 'public' and c.column_name = 'company_id'
             and t.table_type = 'BASE TABLE'
           order by 1`,
        )
      ).rows.map((r) => r.table_name),
    );
    expect(tables.length).toBeGreaterThan(10);

    // Sanity: Company B really has data in these tables (seen by the database owner).
    const seededForB = await asAdmin(async (db) => {
      const counts: Record<string, number> = {};
      for (const t of tables) {
        const r = await db.query<{ n: string }>(
          `select count(*) as n from public.${t} where company_id = $1`,
          [companyB.id],
        );
        counts[t] = Number(r.rows[0]!.n);
      }
      return counts;
    });
    expect(Object.values(seededForB).filter((n) => n > 0).length).toBeGreaterThan(8);

    const leaks: string[] = [];
    for (const t of tables) {
      // Column privileges may forbid select * (e.g. token_hash), so count only.
      const visible = await asUser({ userId: ownerA.id }, async (db) => {
        try {
          const r = await db.query<{ n: string }>(
            `select count(*) as n from public.${t} where company_id = $1`,
            [companyB.id],
          );
          return Number(r.rows[0]!.n);
        } catch (e) {
          // permission denied for the whole table is also isolation
          if (/permission denied/.test((e as Error).message)) return 0;
          throw e;
        }
      });
      if (visible > 0) leaks.push(`${t} (${visible} rows)`);
    }
    expect(leaks, "tables leaking Company B rows to Company A").toEqual([]);
  });

  it("does not show Company B in the companies table", async () => {
    const rows = await asUser(
      { userId: ownerA.id },
      async (db) =>
        (await db.query("select id from public.companies where id = $1", [companyB.id])).rows,
    );
    expect(rows).toEqual([]);
  });

  it("returns no workspace context for Company B's slug", async () => {
    const ctx = await asUser(
      { userId: ownerA.id },
      async (db) =>
        (await db.query("select public.workspace_context($1) as c", [companyB.slug])).rows[0]!.c,
    );
    expect(ctx).toBeNull();
  });

  it("does not let anonymous visitors read any company data", async () => {
    await expectDbError(
      asAnon((db) => db.query("select * from public.companies")),
      /permission denied/,
    );
    await expectDbError(
      asAnon((db) => db.query("select * from public.departments")),
      /permission denied/,
    );
  });
});

describe("2 & 6. Company A cannot modify Company B records, even with B's ids", () => {
  it("cannot update Company B's profile", async () => {
    const res = await asUser({ userId: ownerA.id }, (db) =>
      db.query("update public.companies set name = 'Hacked' where id = $1", [companyB.id]),
    );
    expect(res.rowCount).toBe(0);
  });

  it("cannot insert a department into Company B by supplying B's company_id", async () => {
    await expectDbError(
      asUser({ userId: ownerA.id }, (db) =>
        db.query("insert into public.departments (company_id, name) values ($1, 'Spy')", [
          companyB.id,
        ]),
      ),
      /row-level security/,
    );
  });

  it("cannot update or archive Company B's department or branch", async () => {
    const r1 = await asUser({ userId: ownerA.id }, (db) =>
      db.query("update public.departments set name = 'X' where id = $1", [deptB]),
    );
    const r2 = await asUser({ userId: ownerA.id }, (db) =>
      db.query("update public.branches set archived_at = now() where id = $1", [branchB]),
    );
    expect(r1.rowCount).toBe(0);
    expect(r2.rowCount).toBe(0);
  });

  it("cannot delete Company B's holidays", async () => {
    const r = await asUser({ userId: ownerA.id }, (db) =>
      db.query("delete from public.public_holidays where company_id = $1", [companyB.id]),
    );
    expect(r.rowCount).toBe(0);
  });

  it("cannot create a Company A row that points at a Company B row (composite FK)", async () => {
    await expectDbError(
      asUser({ userId: ownerA.id }, (db) =>
        db.query(
          "insert into public.departments (company_id, name, parent_id) values ($1, 'Child', $2)",
          [companyA.id, deptB],
        ),
      ),
      /foreign key|violates/,
    );
  });

  it("cannot move its own row into Company B", async () => {
    const deptA = await asUser(
      { userId: ownerA.id },
      async (db) =>
        (
          await db.query<{ id: string }>(
            "insert into public.departments (company_id, name) values ($1, 'Ops') returning id",
            [companyA.id],
          )
        ).rows[0]!.id,
    );
    // company_id is not even an updatable column for clients.
    await expectDbError(
      asUser({ userId: ownerA.id }, (db) =>
        db.query("update public.departments set company_id = $1 where id = $2", [
          companyB.id,
          deptA,
        ]),
      ),
      /permission denied/,
    );
  });

  it("cannot assign itself a role in Company B", async () => {
    const roleB = await asAdmin(
      async (db) =>
        (
          await db.query<{ id: string }>(
            "select id from public.roles where company_id = $1 and system_key = 'owner'",
            [companyB.id],
          )
        ).rows[0]!.id,
    );
    const memberA = await asAdmin(
      async (db) =>
        (
          await db.query<{ id: string }>(
            "select id from public.company_members where company_id = $1 and user_id = $2",
            [companyA.id, ownerA.id],
          )
        ).rows[0]!.id,
    );
    await expectDbError(
      asUser({ userId: ownerA.id }, (db) =>
        db.query(
          "insert into public.member_roles (company_id, member_id, role_id) values ($1, $2, $3)",
          [companyB.id, memberA, roleB],
        ),
      ),
      // Rejected by whichever layer runs first: the escalation trigger, the
      // composite foreign key or RLS. Any of them is a correct refusal.
      /row-level security|foreign key|roles whose permissions you hold/,
    );
  });

  it("cannot invite people into Company B", async () => {
    await expectDbError(
      asUser({ userId: ownerA.id }, (db) =>
        db.query(
          `insert into public.company_invitations (company_id, email, token_hash)
           values ($1, 'x@test.wohkah.local', $2)`,
          [companyB.id, newToken().hash],
        ),
      ),
      /row-level security/,
    );
  });
});

describe("5. A user in two companies only acts within the selected workspace", () => {
  it("keeps roles and permissions separate per workspace", async () => {
    // A person who is a plain Employee in Company A and the Owner of "Both Co".
    const both = await addMember(companyA, ownerA.id, ["employee"]);
    const company2 = await createCompany(both.id, "Both Co");

    const ctxA = await asUser(
      { userId: both.id },
      async (db) =>
        (await db.query("select public.workspace_context($1) as c", [companyA.slug])).rows[0]!.c,
    );
    const ctx2 = await asUser(
      { userId: both.id },
      async (db) =>
        (await db.query("select public.workspace_context($1) as c", [company2.slug])).rows[0]!.c,
    );
    expect(ctxA.company.id).toBe(companyA.id);
    expect(ctxA.permissions).toEqual([]);
    expect(ctx2.company.id).toBe(company2.id);
    expect(ctx2.permissions).toContain("departments.manage");

    // Owner rights in "Both Co" do not carry into Company A.
    await expectDbError(
      asUser({ userId: both.id }, (db) =>
        db.query("insert into public.departments (company_id, name) values ($1, 'Nope')", [
          companyA.id,
        ]),
      ),
      /row-level security/,
    );
  });

  it("loses access immediately when their membership is removed", async () => {
    const member = await addMember(companyA, ownerA.id, ["employee"]);
    await asUser({ userId: ownerA.id }, (db) =>
      db.query("update public.company_members set status = 'removed' where id = $1", [
        member.memberId,
      ]),
    );
    const rows = await asUser(
      { userId: member.id },
      async (db) =>
        (await db.query("select id from public.companies where id = $1", [companyA.id])).rows,
    );
    expect(rows).toEqual([]);
  });
});
