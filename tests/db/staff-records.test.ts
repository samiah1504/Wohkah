/**
 * Phase 2: staff records. Private details, branch-scoped managers, the staff
 * member's own read-only view, the status state machine, reporting lines,
 * history, documents and portal-link invitations.
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
  setPlan,
  type Company,
} from "./helpers";

afterAll(() => pool.end());

type Person = { id: string; email: string; memberId: string };

async function addStaff(
  userId: string,
  companyId: string,
  fields: Record<string, unknown> = {},
): Promise<string> {
  const cols = { first_name: "Ada", last_name: "Obi", ...fields };
  const keys = Object.keys(cols);
  return asUser({ userId }, async (db) => {
    const r = await db.query<{ id: string }>(
      `insert into public.employees (company_id, ${keys.join(", ")})
       values ($1, ${keys.map((_, i) => `$${i + 2}`).join(", ")}) returning id`,
      [companyId, ...Object.values(cols)],
    );
    return r.rows[0]!.id;
  });
}

/** A role defined by the business, assigned to a member at company or branch scope. */
async function giveRole(
  company: Company,
  memberId: string,
  name: string,
  permissions: string[],
  branchId?: string,
) {
  await asAdmin(async (db) => {
    const role = await db.query<{ id: string }>(
      "insert into public.roles (company_id, name) values ($1, $2) returning id",
      [company.id, name],
    );
    for (const p of permissions) {
      await db.query(
        "insert into public.role_permissions (company_id, role_id, permission_key) values ($1, $2, $3)",
        [company.id, role.rows[0]!.id, p],
      );
    }
    await db.query(
      `insert into public.member_roles (company_id, member_id, role_id, scope_type, branch_id)
       values ($1, $2, $3, $4, $5)`,
      [company.id, memberId, role.rows[0]!.id, branchId ? "branch" : "company", branchId ?? null],
    );
  });
}

describe("staff records", () => {
  let owner: { id: string };
  let company: Company;
  let lagos: string;
  let abuja: string;
  let viewer: Person; // staff.view only, whole business
  let branchManager: Person; // staff.view/manage/sensitive for Lagos only
  let portal: Person; // a staff member with a sign-in and no permissions
  let lagosStaff: string;
  let abujaStaff: string;
  let portalStaff: string;

  beforeAll(async () => {
    owner = await createUser();
    company = await createCompany(owner.id, "Records Co");
    await setPlan(company.id, "business");
    [lagos, abuja] = await asUser({ userId: owner.id }, async (db) => {
      const ids: string[] = [];
      for (const name of ["Lagos", "Abuja"]) {
        const r = await db.query<{ id: string }>(
          "insert into public.branches (company_id, name) values ($1, $2) returning id",
          [company.id, name],
        );
        ids.push(r.rows[0]!.id);
      }
      return ids as [string, string];
    });
    viewer = await addMember(company, owner.id, ["employee"]);
    branchManager = await addMember(company, owner.id, ["employee"]);
    portal = await addMember(company, owner.id, ["employee"]);
    await giveRole(company, viewer.memberId, "Viewer", ["staff.view"]);
    await giveRole(
      company,
      branchManager.memberId,
      "Lagos Manager",
      ["staff.view", "staff.manage", "staff.sensitive"],
      lagos,
    );
    lagosStaff = await addStaff(owner.id, company.id, { branch_id: lagos, first_name: "Lagos" });
    abujaStaff = await addStaff(owner.id, company.id, { branch_id: abuja, first_name: "Abuja" });
    portalStaff = await addStaff(owner.id, company.id, {
      first_name: "Portal",
      email: portal.email,
      branch_id: lagos,
    });
    await asAdmin((db) =>
      db.query("update public.employees set member_id = $1 where id = $2", [
        portal.memberId,
        portalStaff,
      ]),
    );
    for (const id of [lagosStaff, abujaStaff, portalStaff]) {
      await asUser({ userId: owner.id }, (db) =>
        db.query(
          `insert into public.employee_private (employee_id, company_id, bank_account_number, date_of_birth)
           values ($1, $2, '0123456789', '1990-05-01')`,
          [id, company.id],
        ),
      );
    }
  });

  it("numbers staff per business, builds the full name and keeps the number fixed", async () => {
    const rows = await asUser({ userId: owner.id }, (db) =>
      db.query<{ staff_number: number; full_name: string }>(
        "select staff_number, full_name from public.employees where company_id = $1 order by staff_number",
        [company.id],
      ),
    );
    expect(rows.rows.map((r) => r.staff_number)).toEqual([1, 2, 3]);
    expect(rows.rows[0]!.full_name).toBe("Lagos Obi");
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("update public.employees set staff_number = 99 where id = $1", [lagosStaff]),
      ),
      /permission denied/,
    );
    const after = await asAdmin((db) =>
      db.query<{ staff_number: number }>(
        "select staff_number from public.employees where id = $1",
        [lagosStaff],
      ),
    );
    expect(after.rows[0]!.staff_number).toBe(1);
  });

  it("hides private details from people without private-details access", async () => {
    const seen = await asUser({ userId: viewer.id }, async (db) => {
      const staff = await db.query("select id from public.employees where company_id = $1", [
        company.id,
      ]);
      const priv = await db.query(
        "select employee_id from public.employee_private where company_id = $1",
        [company.id],
      );
      return { staff: staff.rowCount, priv: priv.rowCount };
    });
    expect(seen.staff).toBe(3);
    expect(seen.priv).toBe(0);
  });

  it("limits a branch manager to their own branch, including private details", async () => {
    const seen = await asUser({ userId: branchManager.id }, async (db) => {
      const staff = await db.query<{ id: string }>(
        "select id from public.employees where company_id = $1 order by staff_number",
        [company.id],
      );
      const priv = await db.query<{ employee_id: string }>(
        "select employee_id from public.employee_private where company_id = $1",
        [company.id],
      );
      return { staff: staff.rows.map((r) => r.id), priv: priv.rows.map((r) => r.employee_id) };
    });
    expect(seen.staff.sort()).toEqual([lagosStaff, portalStaff].sort());
    expect(seen.priv.sort()).toEqual([lagosStaff, portalStaff].sort());

    // Can't edit someone in another branch, or move staff into one.
    const updated = await asUser({ userId: branchManager.id }, (db) =>
      db.query("update public.employees set job_title = 'X' where id = $1", [abujaStaff]),
    );
    expect(updated.rowCount).toBe(0);
    await expectDbError(
      asUser({ userId: branchManager.id }, (db) =>
        db.query("update public.employees set branch_id = $1 where id = $2", [abuja, lagosStaff]),
      ),
      /row-level security/,
    );
    await expectDbError(
      addStaff(branchManager.id, company.id, { branch_id: abuja }),
      /row-level security/,
    );
    const ok = await addStaff(branchManager.id, company.id, {
      branch_id: lagos,
      first_name: "New",
    });
    expect(ok).toBeTruthy();
  });

  it("lets someone with private-details access update existing details, but never move them", async () => {
    const updated = await asUser({ userId: owner.id }, (db) =>
      db.query(
        "update public.employee_private set bank_name = 'Example Bank' where employee_id = $1",
        [lagosStaff],
      ),
    );
    expect(updated.rowCount).toBe(1);
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("update public.employee_private set employee_id = $1 where employee_id = $2", [
          abujaStaff,
          lagosStaff,
        ]),
      ),
      /permission denied/,
    );
  });

  it("lets staff see their own record but change nothing", async () => {
    const seen = await asUser({ userId: portal.id }, async (db) => {
      const staff = await db.query<{ id: string }>(
        "select id from public.employees where company_id = $1",
        [company.id],
      );
      const priv = await db.query<{ bank_account_number: string }>(
        "select bank_account_number from public.employee_private where company_id = $1",
        [company.id],
      );
      const history = await db.query<{ employee_id: string }>(
        "select distinct employee_id from public.employee_history where company_id = $1",
        [company.id],
      );
      return {
        staff: staff.rows.map((r) => r.id),
        priv: priv.rows,
        history: history.rows.map((r) => r.employee_id),
      };
    });
    expect(seen.staff).toEqual([portalStaff]);
    expect(seen.priv).toEqual([{ bank_account_number: "0123456789" }]);
    expect(seen.history).toEqual([portalStaff]);

    const own = await asUser({ userId: portal.id }, (db) =>
      db.query("update public.employees set job_title = 'CEO' where id = $1", [portalStaff]),
    );
    expect(own.rowCount).toBe(0);
    const ownPrivate = await asUser({ userId: portal.id }, (db) =>
      db.query(
        "update public.employee_private set bank_account_number = '9999999999' where employee_id = $1",
        [portalStaff],
      ),
    );
    expect(ownPrivate.rowCount).toBe(0);
  });

  it("never shows another business's staff", async () => {
    const other = await createUser();
    const otherCo = await createCompany(other.id, "Other Co");
    const theirs = await addStaff(other.id, otherCo.id);
    const seen = await asUser({ userId: owner.id }, async (db) => {
      const a = await db.query("select id from public.employees where id = $1", [theirs]);
      const b = await db.query("select 1 from public.employee_private where company_id = $1", [
        otherCo.id,
      ]);
      const c = await db.query("select 1 from public.employee_history where company_id = $1", [
        otherCo.id,
      ]);
      return a.rowCount! + b.rowCount! + c.rowCount!;
    });
    expect(seen).toBe(0);
    await expectDbError(addStaff(owner.id, otherCo.id), /row-level security/);
    // A manager in one business can't point a record at another business's staff.
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("update public.employees set reports_to = $1 where id = $2", [theirs, lagosStaff]),
      ),
      /foreign key|violates/,
    );
  });

  it("follows the status rules and records leaving dates", async () => {
    const id = await addStaff(owner.id, company.id, { first_name: "Status" });
    // Active -> archived directly is not allowed.
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("update public.employees set status = 'archived' where id = $1", [id]),
      ),
      /status_change_not_allowed/,
    );
    // Only billing may pause staff for the plan limit.
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("update public.employees set status = 'plan_suspended' where id = $1", [id]),
      ),
      /paused staff/,
    );
    const left = await asUser({ userId: owner.id }, async (db) => {
      await db.query("update public.employees set status = 'resigned' where id = $1", [id]);
      return db.query<{ end_date: string | null }>(
        "select end_date::text from public.employees where id = $1",
        [id],
      );
    });
    expect(left.rows[0]!.end_date).not.toBeNull();
    const back = await asUser({ userId: owner.id }, async (db) => {
      await db.query("update public.employees set status = 'active' where id = $1", [id]);
      return db.query<{ end_date: string | null }>(
        "select end_date::text from public.employees where id = $1",
        [id],
      );
    });
    expect(back.rows[0]!.end_date).toBeNull();
  });

  it("refuses reporting loops", async () => {
    const a = await addStaff(owner.id, company.id, { first_name: "A" });
    const b = await addStaff(owner.id, company.id, { first_name: "B", reports_to: a });
    const c = await addStaff(owner.id, company.id, { first_name: "C", reports_to: b });
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("update public.employees set reports_to = $1 where id = $2", [c, a]),
      ),
      /reporting_cycle/,
    );
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("update public.employees set reports_to = id where id = $1", [a]),
      ),
      /check|reporting_cycle/,
    );
  });

  it("keeps an append-only history of changes", async () => {
    const id = await addStaff(owner.id, company.id, {
      first_name: "History",
      job_title: "Cashier",
    });
    await asUser({ userId: owner.id }, async (db) => {
      await db.query("update public.employees set job_title = 'Supervisor' where id = $1", [id]);
      await db.query("update public.employees set status = 'on_leave' where id = $1", [id]);
    });
    const events = await asUser({ userId: owner.id }, (db) =>
      db.query<{ event: string; details: Record<string, string> }>(
        "select event, details from public.employee_history where employee_id = $1 order by id",
        [id],
      ),
    );
    expect(events.rows.map((e) => e.event)).toEqual([
      "added",
      "job_title_changed",
      "status_changed",
    ]);
    expect(events.rows[1]!.details).toMatchObject({ from: "Cashier", to: "Supervisor" });
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("update public.employee_history set event = 'added' where employee_id = $1", [id]),
      ),
      /permission denied|row-level security|append/,
    );
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("delete from public.employee_history where employee_id = $1", [id]),
      ),
      /permission denied|row-level security|append/,
    );
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query(
          "insert into public.employee_history (company_id, employee_id, event) values ($1, $2, 'added')",
          [company.id, id],
        ),
      ),
      /permission denied|row-level security/,
    );
  });

  it("never deletes staff records", async () => {
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("delete from public.employees where id = $1", [lagosStaff]),
      ),
      /permission denied/,
    );
  });

  it("stores documents per staff member, within the plan's storage", async () => {
    const path = `${company.id}/${lagosStaff}/a-contract.pdf`;
    const docId = await asUser({ userId: owner.id }, async (db) => {
      const r = await db.query<{ id: string }>(
        `insert into public.employee_documents (company_id, employee_id, category, name, storage_path, size_bytes)
         values ($1, $2, 'contract', 'Contract', $3, 1000) returning id`,
        [company.id, lagosStaff, path],
      );
      return r.rows[0]!.id;
    });
    // The path must belong to the same business and staff member.
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query(
          `insert into public.employee_documents (company_id, employee_id, category, name, storage_path, size_bytes)
           values ($1, $2, 'contract', 'Contract', $3, 1000)`,
          [company.id, lagosStaff, `${company.id}/${abujaStaff}/x.pdf`],
        ),
      ),
      /check/,
    );
    // Only archive/restore after upload.
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("update public.employee_documents set name = 'Renamed' where id = $1", [docId]),
      ),
      /permission denied|archived or restored/,
    );
    await asUser({ userId: owner.id }, (db) =>
      db.query("update public.employee_documents set archived_at = now() where id = $1", [docId]),
    );
    // Viewers without private-details access don't see documents; the staff member does.
    const viewerDocs = await asUser({ userId: viewer.id }, (db) =>
      db.query("select id from public.employee_documents where company_id = $1", [company.id]),
    );
    expect(viewerDocs.rowCount).toBe(0);
    await asUser({ userId: owner.id }, (db) =>
      db.query(
        `insert into public.employee_documents (company_id, employee_id, category, name, storage_path, size_bytes)
         values ($1, $2, 'letter', 'Offer letter', $3, 2000)`,
        [company.id, portalStaff, `${company.id}/${portalStaff}/offer.pdf`],
      ),
    );
    const ownDocs = await asUser({ userId: portal.id }, (db) =>
      db.query<{ name: string }>(
        "select name from public.employee_documents where company_id = $1",
        [company.id],
      ),
    );
    expect(ownDocs.rows.map((r) => r.name)).toEqual(["Offer letter"]);
    await expectDbError(
      asUser({ userId: portal.id }, (db) =>
        db.query(
          `insert into public.employee_documents (company_id, employee_id, category, name, storage_path, size_bytes)
           values ($1, $2, 'other', 'Mine', $3, 10)`,
          [company.id, portalStaff, `${company.id}/${portalStaff}/mine.pdf`],
        ),
      ),
      /row-level security/,
    );
  });

  it("shows documents in the storage used on the subscription page", async () => {
    const usage = await asUser({ userId: owner.id }, (db) =>
      db.query<{ mb: number }>(
        "select (public.subscription_overview($1) -> 'usage' ->> 'storage_mb')::int as mb",
        [company.id],
      ),
    );
    // A few small test files round up to 1 MB.
    expect(usage.rows[0]!.mb).toBe(1);
  });

  it("refuses uploads past the plan's storage allowance", async () => {
    const o = await createUser();
    const co = await createCompany(o.id, "Small Co");
    const s = await addStaff(o.id, co.id);
    await expectDbError(
      asUser({ userId: o.id }, (db) =>
        db.query(
          `insert into public.employee_documents (company_id, employee_id, category, name, storage_path, size_bytes)
           values ($1, $2, 'other', 'Huge', $3, $4)`,
          [co.id, s, `${co.id}/${s}/huge.pdf`, 501 * 1024 * 1024],
        ),
      ),
      /storage_limit_exceeded:500/,
    );
  });

  it("links a staff portal invitation to the right record only", async () => {
    const person = await createUser();
    const id = await addStaff(owner.id, company.id, { first_name: "Invitee", email: person.email });
    // Someone without staff.manage can't link an invitation to a record.
    await expectDbError(
      asUser({ userId: viewer.id }, (db) =>
        db.query(
          `insert into public.company_invitations (company_id, email, role_ids, token_hash, employee_id)
           values ($1, $2, '{}', $3, $4)`,
          [company.id, person.email, newToken().hash, id],
        ),
      ),
      /row-level security|access to this staff record/,
    );
    // The email must match the record.
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query(
          `insert into public.company_invitations (company_id, email, role_ids, token_hash, employee_id)
           values ($1, 'someone.else@example.com', '{}', $2, $3)`,
          [company.id, newToken().hash, id],
        ),
      ),
      /staff_email_mismatch/,
    );
    const { token, hash } = newToken();
    await asUser({ userId: owner.id }, (db) =>
      db.query(
        `insert into public.company_invitations (company_id, email, role_ids, token_hash, employee_id)
         values ($1, $2, '{}', $3, $4)`,
        [company.id, person.email, hash, id],
      ),
    );
    await asUser({ userId: person.id }, (db) =>
      db.query("select public.accept_invitation($1)", [token]),
    );
    const linked = await asUser({ userId: person.id }, (db) =>
      db.query<{ id: string }>("select id from public.employees where company_id = $1", [
        company.id,
      ]),
    );
    expect(linked.rows.map((r) => r.id)).toEqual([id]);
    // Already linked: a second invitation is refused.
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query(
          `insert into public.company_invitations (company_id, email, role_ids, token_hash, employee_id)
           values ($1, $2, '{}', $3, $4)`,
          [company.id, person.email, newToken().hash, id],
        ),
      ),
      /staff_already_linked/,
    );
  });
  // Supabase Storage exists in CI (real Supabase Postgres), not in the local shim.
  it("keeps document files private to the business, the right managers and the staff member", async (t) => {
    const hasStorage = await asAdmin((db) =>
      db.query("select 1 from pg_namespace where nspname = 'storage'"),
    );
    if (!hasStorage.rowCount) t.skip();
    const files = [
      `${company.id}/${abujaStaff}/abuja.pdf`,
      `${company.id}/${portalStaff}/portal.pdf`,
    ];
    await asAdmin(async (db) => {
      for (const name of files)
        await db.query(
          "insert into storage.objects (bucket_id, name) values ('staff-documents', $1)",
          [name],
        );
    });
    const visible = (userId: string) =>
      asUser({ userId }, async (db) => {
        const r = await db.query<{ name: string }>(
          "select name from storage.objects where bucket_id = 'staff-documents' and name = any($1) order by name",
          [files],
        );
        return r.rows.map((x) => x.name);
      });
    expect(await visible(owner.id)).toEqual([...files].sort());
    expect(await visible(viewer.id)).toEqual([]);
    expect(await visible(branchManager.id)).toEqual([files[1]]);
    expect(await visible(portal.id)).toEqual([files[1]]);
    const outsider = await createUser();
    await createCompany(outsider.id, "Outsider Co");
    expect(await visible(outsider.id)).toEqual([]);
    // Nobody can place a file in another business's folder, or in their own record.
    for (const userId of [outsider.id, portal.id, viewer.id]) {
      await expectDbError(
        asUser({ userId }, (db) =>
          db.query("insert into storage.objects (bucket_id, name) values ('staff-documents', $1)", [
            `${company.id}/${portalStaff}/sneaky-${userId}.pdf`,
          ]),
        ),
        /row-level security/,
      );
    }
  });
});
