/**
 * Phase 3: contracts, electronic signatures, job descriptions and
 * acknowledgements. Plan gating, who sees drafts, frozen content and its
 * fingerprint, service-role-only signatures, both-party completion, and
 * versioned job descriptions.
 */
import { createHash } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  addMember,
  asAdmin,
  asService,
  asUser,
  createCompany,
  createUser,
  expectDbError,
  pool,
  setPlan,
  type Company,
} from "./helpers";

afterAll(() => pool.end());

type Person = { id: string; email: string; memberId: string };

const BODY = "# Contract\n\nThis is between {{Business name}} and Ada.";

async function addStaff(userId: string, companyId: string, fields: Record<string, unknown> = {}) {
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

async function newContract(
  userId: string,
  companyId: string,
  employeeId: string,
  kind = "contract",
  body = BODY,
) {
  return asUser({ userId }, async (db) => {
    const r = await db.query<{ id: string }>(
      `insert into public.contracts (company_id, employee_id, kind, title, body)
       values ($1, $2, $3, 'Contract of Employment', $4) returning id`,
      [companyId, employeeId, kind, body],
    );
    return r.rows[0]!.id;
  });
}

function sign(contractId: string, userId: string, party: string, hash: string) {
  return asService((db) =>
    db.query<{ record_contract_signature: { completed: boolean } }>(
      `select public.record_contract_signature($1, $2, $3, 'Signer Name', 'typed', 'Signer Name',
         'I agree.', '2026-11-15', $4, '102.89.1.2', 'Mozilla/5.0', now())`,
      [contractId, userId, party, hash],
    ),
  );
}

async function linkStaff(employeeId: string, memberId: string) {
  await asAdmin((db) =>
    db.query("update public.employees set member_id = $1 where id = $2", [memberId, employeeId]),
  );
}

describe("contracts", () => {
  let owner: { id: string };
  let company: Company;
  let staffUser: Person;
  let colleague: Person;
  let staffId: string;
  let colleagueId: string;

  beforeAll(async () => {
    owner = await createUser();
    company = await createCompany(owner.id, "Contracts Co");
    await setPlan(company.id, "starter");
    staffUser = await addMember(company, owner.id, ["employee"]);
    colleague = await addMember(company, owner.id, ["employee"]);
    staffId = await addStaff(owner.id, company.id, { email: staffUser.email });
    colleagueId = await addStaff(owner.id, company.id, { first_name: "Colleague" });
    await linkStaff(staffId, staffUser.memberId);
    await linkStaff(colleagueId, colleague.memberId);
  });

  it("needs a plan with contracts", async () => {
    const o = await createUser();
    const free = await createCompany(o.id, "Free Co");
    const s = await addStaff(o.id, free.id);
    await expectDbError(newContract(o.id, free.id, s), /feature_not_in_plan:digital_contracts/);
    await expectDbError(
      asUser({ userId: o.id }, (db) =>
        db.query(
          "insert into public.contract_templates (company_id, name, body) values ($1, 'T', $2)",
          [free.id, BODY],
        ),
      ),
      /row-level security/,
    );
  });

  it("keeps drafts from staff, then freezes and fingerprints the text when sent", async () => {
    const id = await newContract(owner.id, company.id, staffId);
    const seenDraft = await asUser({ userId: staffUser.id }, (db) =>
      db.query("select id from public.contracts where id = $1", [id]),
    );
    expect(seenDraft.rowCount).toBe(0);

    // Blanks must be filled before sending.
    await expectDbError(
      asUser({ userId: owner.id }, (db) => db.query("select public.send_contract($1)", [id])),
      /contract_has_blanks/,
    );
    await asUser({ userId: owner.id }, (db) =>
      db.query("update public.contracts set body = $1 where id = $2", [
        "# Contract\n\nThis is between Contracts Co and Ada.",
        id,
      ]),
    );
    const hash = await asUser(
      { userId: owner.id },
      async (db) =>
        (await db.query<{ h: string }>("select public.send_contract($1) as h", [id])).rows[0]!.h,
    );
    const expected = createHash("sha256")
      .update(
        `${id}\nContract of Employment\n\n# Contract\n\nThis is between Contracts Co and Ada.`,
      )
      .digest("hex");
    expect(hash).toBe(expected);

    // Locked after sending, even for the owner.
    await expectDbError(
      asUser({ userId: owner.id }, async (db) => {
        const r = await db.query(
          "update public.contracts set body = 'changed text here' where id = $1",
          [id],
        );
        if (r.rowCount === 0) throw new Error("row-level security blocked the update");
      }),
      /contract_locked|row-level security/,
    );
    // Clients can't change status or the fingerprint at all.
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("update public.contracts set status = 'completed' where id = $1", [id]),
      ),
      /permission denied/,
    );

    // The staff member now sees it; a colleague doesn't.
    const mine = await asUser({ userId: staffUser.id }, (db) =>
      db.query("select id from public.contracts where id = $1", [id]),
    );
    expect(mine.rowCount).toBe(1);
    const theirs = await asUser({ userId: colleague.id }, (db) =>
      db.query("select id from public.contracts where id = $1", [id]),
    );
    expect(theirs.rowCount).toBe(0);
  });

  it("accepts signatures only from the service role, for the right people, on the exact text", async () => {
    const id = await newContract(
      owner.id,
      company.id,
      staffId,
      "contract",
      "# Contract\n\nFinal text here.",
    );
    const hash = await asUser(
      { userId: owner.id },
      async (db) =>
        (await db.query<{ h: string }>("select public.send_contract($1) as h", [id])).rows[0]!.h,
    );

    // Browsers can't sign directly or write signatures.
    await expectDbError(
      asUser({ userId: staffUser.id }, (db) =>
        db.query(
          `select public.record_contract_signature($1, $2, 'staff', 'X', 'typed', 'X', 'c', 'v', $3, null, null, now())`,
          [id, staffUser.id, hash],
        ),
      ),
      /permission denied/,
    );
    await expectDbError(
      asUser({ userId: staffUser.id }, (db) =>
        db.query(
          `insert into public.contract_signatures (company_id, contract_id, party, signer_user_id, signer_name,
             mark_type, mark, consent_text, consent_version, content_hash, code_verified_at)
           values ($1, $2, 'staff', $3, 'X', 'typed', 'X', 'c', 'v', $4, now())`,
          [company.id, id, staffUser.id, hash],
        ),
      ),
      /permission denied/,
    );
    // Signing codes are never visible to browsers.
    await expectDbError(
      asUser({ userId: owner.id }, (db) => db.query("select 1 from public.contract_signing_codes")),
      /permission denied/,
    );

    // Wrong person, wrong text.
    await expectDbError(sign(id, colleague.id, "staff", hash), /not_a_signer/);
    await expectDbError(sign(id, colleague.id, "business", hash), /not_a_signer/);
    await expectDbError(sign(id, staffUser.id, "staff", "0".repeat(64)), /contract_changed/);

    // Staff signs, then the owner signs for the business: complete.
    const first = await sign(id, staffUser.id, "staff", hash);
    expect(first.rows[0]!.record_contract_signature).toEqual({ completed: false });
    await expectDbError(sign(id, staffUser.id, "staff", hash), /already_signed/);
    const second = await sign(id, owner.id, "business", hash);
    expect(second.rows[0]!.record_contract_signature).toEqual({ completed: true });

    const after = await asUser({ userId: staffUser.id }, async (db) => {
      const c = await db.query<{ status: string }>(
        "select status from public.contracts where id = $1",
        [id],
      );
      const s = await db.query<{ party: string; ip_address: string }>(
        "select party, host(ip_address) as ip_address from public.contract_signatures where contract_id = $1 order by party",
        [id],
      );
      const e = await db.query<{ event: string }>(
        "select event from public.contract_events where contract_id = $1 order by id",
        [id],
      );
      const h = await db.query<{ event: string }>(
        "select event from public.employee_history where employee_id = $1 and event = 'contract_signed'",
        [staffId],
      );
      return {
        status: c.rows[0]!.status,
        sigs: s.rows,
        events: e.rows.map((r) => r.event),
        history: h.rowCount,
      };
    });
    expect(after.status).toBe("completed");
    expect(after.sigs).toEqual([
      { party: "business", ip_address: "102.89.1.2" },
      { party: "staff", ip_address: "102.89.1.2" },
    ]);
    expect(after.events).toEqual(["created", "sent", "signed", "signed", "completed"]);
    expect(after.history).toBeGreaterThanOrEqual(1);

    // Evidence is append-only, even for the service role's ordinary writes.
    await expectDbError(
      asService((db) =>
        db.query("update public.contract_signatures set signer_name = 'X' where contract_id = $1", [
          id,
        ]),
      ),
      /append-only/,
    );
    await expectDbError(
      asService((db) =>
        db.query("delete from public.contract_events where contract_id = $1", [id]),
      ),
      /append-only/,
    );
    // Signed contracts can't be cancelled; an updated version is a new contract.
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("select public.cancel_contract($1, 'x')", [id]),
      ),
      /contract_locked/,
    );
  });

  it("never lets one person sign for both sides", async () => {
    // The owner is also a staff member of their own business.
    const ownerMember = await asAdmin(
      async (db) =>
        (
          await db.query<{ id: string }>(
            "select id from public.company_members where company_id = $1 and user_id = $2",
            [company.id, owner.id],
          )
        ).rows[0]!.id,
    );
    const ownerStaff = await addStaff(owner.id, company.id, { first_name: "Owner" });
    await linkStaff(ownerStaff, ownerMember);
    const id = await newContract(
      owner.id,
      company.id,
      ownerStaff,
      "contract",
      "# Contract\n\nOwner's own.",
    );
    const hash = await asUser(
      { userId: owner.id },
      async (db) =>
        (await db.query<{ h: string }>("select public.send_contract($1) as h", [id])).rows[0]!.h,
    );
    await sign(id, owner.id, "staff", hash);
    await expectDbError(sign(id, owner.id, "business", hash), /same_person_both_parties/);
  });

  it("completes a policy with the staff member's confirmation alone", async () => {
    const id = await newContract(
      owner.id,
      company.id,
      staffId,
      "policy",
      "# Handbook\n\nI have read it.",
    );
    const hash = await asUser(
      { userId: owner.id },
      async (db) =>
        (await db.query<{ h: string }>("select public.send_contract($1) as h", [id])).rows[0]!.h,
    );
    await expectDbError(sign(id, owner.id, "business", hash), /not_a_signer/);
    const out = await sign(id, staffUser.id, "staff", hash);
    expect(out.rows[0]!.record_contract_signature).toEqual({ completed: true });
  });

  it("keeps signed copies private to the people who can see the contract", async (t) => {
    const hasStorage = await asAdmin((db) =>
      db.query("select 1 from pg_namespace where nspname = 'storage'"),
    );
    if (!hasStorage.rowCount) t.skip();
    const id = await newContract(owner.id, company.id, staffId, "policy", "# Rules\n\nRead me.");
    const hash = await asUser(
      { userId: owner.id },
      async (db) =>
        (await db.query<{ h: string }>("select public.send_contract($1) as h", [id])).rows[0]!.h,
    );
    await sign(id, staffUser.id, "staff", hash);
    const path = `${company.id}/${id}/signed-test.pdf`;
    await asAdmin((db) =>
      db.query("insert into storage.objects (bucket_id, name) values ('contracts', $1)", [path]),
    );
    const sees = (userId: string) =>
      asUser(
        { userId },
        async (db) =>
          (
            await db.query(
              "select 1 from storage.objects where bucket_id = 'contracts' and name = $1",
              [path],
            )
          ).rowCount,
      );
    expect(await sees(owner.id)).toBe(1);
    expect(await sees(staffUser.id)).toBe(1);
    expect(await sees(colleague.id)).toBe(0);
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("insert into storage.objects (bucket_id, name) values ('contracts', $1)", [
          `${company.id}/${id}/forged.pdf`,
        ]),
      ),
      /row-level security/,
    );
  });

  it("never shows another business's contracts", async () => {
    const other = await createUser();
    const otherCo = await createCompany(other.id, "Other Co");
    await setPlan(otherCo.id, "starter");
    const theirStaff = await addStaff(other.id, otherCo.id);
    const theirs = await newContract(other.id, otherCo.id, theirStaff);
    const seen = await asUser({ userId: owner.id }, (db) =>
      db.query("select id from public.contracts where id = $1", [theirs]),
    );
    expect(seen.rowCount).toBe(0);
    await expectDbError(newContract(owner.id, otherCo.id, theirStaff), /row-level security/);
    // A contract can't point at another business's staff.
    await expectDbError(
      newContract(owner.id, company.id, theirStaff),
      /foreign key|violates|row-level/,
    );
    await expectDbError(
      asUser({ userId: owner.id }, (db) => db.query("select public.send_contract($1)", [theirs])),
      /access to this contract/,
    );
  });
});

describe("job descriptions", () => {
  let owner: { id: string };
  let company: Company;
  let staffUser: Person;
  let staffId: string;
  let otherStaffUser: Person;

  beforeAll(async () => {
    owner = await createUser();
    company = await createCompany(owner.id, "JD Co");
    await setPlan(company.id, "starter");
    staffUser = await addMember(company, owner.id, ["employee"]);
    otherStaffUser = await addMember(company, owner.id, ["employee"]);
    staffId = await addStaff(owner.id, company.id, { first_name: "Cashier" });
    await linkStaff(staffId, staffUser.memberId);
    const otherId = await addStaff(owner.id, company.id, { first_name: "Other" });
    await linkStaff(otherId, otherStaffUser.memberId);
  });

  it("publishes numbered versions that can't be changed, and records confirmations", async () => {
    const jd = await asUser({ userId: owner.id }, async (db) => {
      const r = await db.query<{ id: string }>(
        "insert into public.job_descriptions (company_id, title) values ($1, 'Cashier') returning id",
        [company.id],
      );
      const id = r.rows[0]!.id;
      for (const body of [
        "## Duties\n- Count cash at close",
        "## Duties\n- Count cash\n- Open the shop",
      ]) {
        await db.query(
          "insert into public.job_description_versions (company_id, job_description_id, body) values ($1, $2, $3)",
          [company.id, id, body],
        );
      }
      return id;
    });
    const versions = await asUser({ userId: owner.id }, (db) =>
      db.query<{ id: string; version: number }>(
        "select id, version from public.job_description_versions where job_description_id = $1 order by version",
        [jd],
      ),
    );
    expect(versions.rows.map((v) => v.version)).toEqual([1, 2]);
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query(
          "update public.job_description_versions set body = 'x' where job_description_id = $1",
          [jd],
        ),
      ),
      /permission denied|append-only/,
    );

    // Staff can't see a job description that isn't theirs, or confirm it.
    const before = await asUser({ userId: staffUser.id }, (db) =>
      db.query("select id from public.job_descriptions where id = $1", [jd]),
    );
    expect(before.rowCount).toBe(0);
    await expectDbError(
      asUser({ userId: staffUser.id }, (db) =>
        db.query("select public.acknowledge_job_description($1)", [versions.rows[1]!.id]),
      ),
      /access to this job description/,
    );

    // Assign it; only the owner (job_descriptions.manage) can.
    await expectDbError(
      asUser({ userId: staffUser.id }, (db) =>
        db.query("select public.assign_job_description($1, $2)", [jd, [staffId]]),
      ),
      /access to this job description/,
    );
    await asUser({ userId: owner.id }, (db) =>
      db.query("select public.assign_job_description($1, $2)", [jd, [staffId]]),
    );

    // Only the current version can be confirmed, once.
    await expectDbError(
      asUser({ userId: staffUser.id }, (db) =>
        db.query("select public.acknowledge_job_description($1)", [versions.rows[0]!.id]),
      ),
      /job_description_changed/,
    );
    await asUser({ userId: staffUser.id }, async (db) => {
      await db.query("select public.acknowledge_job_description($1, 'Phone')", [
        versions.rows[1]!.id,
      ]);
      await db.query("select public.acknowledge_job_description($1, 'Phone')", [
        versions.rows[1]!.id,
      ]);
    });
    const acks = await asUser({ userId: owner.id }, (db) =>
      db.query(
        "select employee_id from public.job_description_acknowledgements where version_id = $1",
        [versions.rows[1]!.id],
      ),
    );
    expect(acks.rows).toEqual([{ employee_id: staffId }]);

    // Another staff member can't confirm on someone else's behalf, or see it.
    await expectDbError(
      asUser({ userId: otherStaffUser.id }, (db) =>
        db.query("select public.acknowledge_job_description($1)", [versions.rows[1]!.id]),
      ),
      /access to this job description/,
    );
    const otherSees = await asUser({ userId: otherStaffUser.id }, (db) =>
      db.query("select 1 from public.job_description_acknowledgements"),
    );
    expect(otherSees.rowCount).toBe(0);

    // Clients can't change the assignment column directly.
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("update public.employees set job_description_id = null where id = $1", [staffId]),
      ),
      /permission denied/,
    );
  });

  it("needs a plan with job descriptions", async () => {
    const o = await createUser();
    const free = await createCompany(o.id, "Free JD Co");
    await expectDbError(
      asUser({ userId: o.id }, (db) =>
        db.query("insert into public.job_descriptions (company_id, title) values ($1, 'X')", [
          free.id,
        ]),
      ),
      /row-level security/,
    );
  });
});
