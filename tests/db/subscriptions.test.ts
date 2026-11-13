/**
 * Approved pricing rules (docs/PRICING_AUDIT.md), proven in the database:
 * staff allowances, add-ons, work locations, branches, trials,
 * expiry, downgrades, staff selection, reactivation and price quotes.
 */
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { quote } from "@/lib/plans/quote";
import {
  addMember,
  asAdmin,
  asUser,
  createCompany,
  createUser,
  expectDbError,
  pool,
  type Company,
} from "./helpers";

afterAll(() => pool.end());

type Sub = {
  plan: string;
  status?: "active" | "trialing";
  extraStaff?: number;
  extraLocations?: number;
  periodEnd?: string | null;
};

/** Test fixture: sets the subscription directly (simulates verified billing; never used by the app). */
async function setSubscription(companyId: string, s: Sub) {
  await asAdmin((db) =>
    db.query(
      `update public.company_subscriptions set
         plan_id = (select id from public.subscription_plans where code = $2),
         status = $3, extra_staff = $4, extra_work_locations = $5,
         current_period_end = $6::timestamptz, billing_interval = 'monthly'
       where company_id = $1`,
      [
        companyId,
        s.plan,
        s.status ?? "active",
        s.extraStaff ?? 0,
        s.extraLocations ?? 0,
        s.periodEnd ?? null,
      ],
    ),
  );
}

async function owned(): Promise<{ owner: { id: string; email: string }; company: Company }> {
  const owner = await createUser();
  const company = await createCompany(owner.id);
  return { owner, company };
}

async function addStaff(company: Company, userId: string, n: number, prefix = "Staff") {
  const ids: string[] = [];
  await asUser({ userId }, async (db) => {
    for (let i = 0; i < n; i++) {
      const r = await db.query<{ id: string }>(
        "insert into public.employees (company_id, full_name) values ($1, $2) returning id",
        [company.id, `${prefix} ${i + 1}`],
      );
      ids.push(r.rows[0]!.id);
    }
  });
  return ids;
}

const activeStaff = (companyId: string) =>
  asAdmin(async (db) =>
    Number(
      (
        await db.query(
          "select count(*) from public.employees where company_id = $1 and status in ('active','on_leave','suspended')",
          [companyId],
        )
      ).rows[0].count,
    ),
  );

describe("active staff allowances", () => {
  it("Free: 3 active staff allowed, a fourth is refused (no paid extras on Free)", async () => {
    const { owner, company } = await owned();
    await addStaff(company, owner.id, 3);
    await expectDbError(addStaff(company, owner.id, 1, "Fourth"), /staff_limit_exceeded:3/);
    // Even if extra capacity were recorded, Free can't use it.
    await setSubscription(company.id, { plan: "free", extraStaff: 5 });
    await expectDbError(addStaff(company, owner.id, 1, "Fourth"), /staff_limit_exceeded:3/);
  });

  it("Starter: 10 included, the 11th needs paid extra capacity", async () => {
    const { owner, company } = await owned();
    await setSubscription(company.id, { plan: "starter" });
    await addStaff(company, owner.id, 10);
    await expectDbError(addStaff(company, owner.id, 1, "Eleventh"), /staff_limit_exceeded:10/);
    await setSubscription(company.id, { plan: "starter", extraStaff: 1 });
    await addStaff(company, owner.id, 1, "Eleventh");
    expect(await activeStaff(company.id)).toBe(11);
  });

  it("Growth: 26th staff member needs extra capacity", async () => {
    const { owner, company } = await owned();
    await setSubscription(company.id, { plan: "growth" });
    await addStaff(company, owner.id, 25);
    await expectDbError(addStaff(company, owner.id, 1, "26th"), /staff_limit_exceeded:25/);
  });

  it("Business: 51 active staff after buying one extra", async () => {
    const { owner, company } = await owned();
    await setSubscription(company.id, { plan: "business" });
    await addStaff(company, owner.id, 50);
    await expectDbError(addStaff(company, owner.id, 1, "51st"), /staff_limit_exceeded:50/);
    await setSubscription(company.id, { plan: "business", extraStaff: 1 });
    await addStaff(company, owner.id, 1, "51st");
    expect(await activeStaff(company.id)).toBe(51);
  });

  it("staff who left don't count, and can't be paused directly by a client", async () => {
    const { owner, company } = await owned();
    const [a] = await addStaff(company, owner.id, 3);
    await asUser({ userId: owner.id }, (db) =>
      db.query("update public.employees set status = 'resigned' where id = $1", [a]),
    );
    await addStaff(company, owner.id, 1, "Replacement");
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("update public.employees set status = 'plan_suspended' where company_id = $1", [
          company.id,
        ]),
      ),
      /staff selection or reactivation/,
    );
  });
});

describe("work locations and branches", () => {
  const addLocations = (company: Company, userId: string, n: number, start = 1) =>
    asUser({ userId }, async (db) => {
      for (let i = 0; i < n; i++) {
        await db.query("insert into public.work_locations (company_id, name) values ($1, $2)", [
          company.id,
          `Location ${start + i}`,
        ]);
      }
    });

  it("Business includes 10 work locations; the 11th needs an extra location", async () => {
    const { owner, company } = await owned();
    await setSubscription(company.id, { plan: "business" });
    await addLocations(company, owner.id, 10);
    await expectDbError(addLocations(company, owner.id, 1, 11), /work_location_limit_exceeded:10/);
    await setSubscription(company.id, { plan: "business", extraLocations: 1 });
    await addLocations(company, owner.id, 1, 11);
  });

  it("Free 1, Starter 2, Growth 5 included work locations", async () => {
    for (const [plan, n] of [
      ["free", 1],
      ["starter", 2],
      ["growth", 5],
    ] as const) {
      const { owner, company } = await owned();
      await setSubscription(company.id, { plan });
      await addLocations(company, owner.id, n);
      await expectDbError(
        addLocations(company, owner.id, 1, n + 1),
        new RegExp(`work_location_limit_exceeded:${n}`),
      );
    }
  });

  it("branches: Free 1, Starter 2, Growth 5, Business 10 (no plan is unlimited)", async () => {
    const add = (c: Company, u: string, name: string) =>
      asUser({ userId: u }, (db) =>
        db.query("insert into public.branches (company_id, name) values ($1, $2)", [c.id, name]),
      );
    for (const [plan, n] of [
      ["free", 1],
      ["starter", 2],
      ["growth", 5],
      ["business", 10],
    ] as const) {
      const { owner, company } = await owned();
      await setSubscription(company.id, { plan });
      for (let i = 1; i <= n; i++) await add(company, owner.id, `Branch ${i}`);
      // Direct API inserts can't get past the allowance.
      await expectDbError(
        add(company, owner.id, `Branch ${n + 1}`),
        new RegExp(`plan_limit_exceeded:branches:${n}`),
      );
    }
  });

  it("restoring an archived branch also counts against the allowance", async () => {
    const { owner, company } = await owned();
    const ids = await asUser({ userId: owner.id }, async (db) => {
      const a = await db.query(
        "insert into public.branches (company_id, name) values ($1, 'One') returning id",
        [company.id],
      );
      await db.query("update public.branches set archived_at = now() where id = $1", [
        a.rows[0].id,
      ]);
      await db.query("insert into public.branches (company_id, name) values ($1, 'Two')", [
        company.id,
      ]);
      return a.rows[0].id as string;
    });
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("update public.branches set archived_at = null where id = $1", [ids]),
      ),
      /plan_limit_exceeded:branches:1/,
    );
  });

  it("branch and work-location allowances are separate", async () => {
    const { owner, company } = await owned(); // Free: 1 branch, 1 work location
    await asUser({ userId: owner.id }, (db) =>
      db.query("insert into public.branches (company_id, name) values ($1, 'Shop')", [company.id]),
    );
    await addLocations(company, owner.id, 1); // still allowed after the branch
    await expectDbError(addLocations(company, owner.id, 1, 2), /work_location_limit_exceeded:1/);
  });

  it("departments are gone: no table, permission, role or role scope", async () => {
    const { company } = await owned();
    const out = await asAdmin(async (db) => ({
      table: (await db.query("select to_regclass('public.departments') as t")).rows[0].t,
      permission: Number(
        (await db.query("select count(*) from public.permissions where key = 'departments.manage'"))
          .rows[0].count,
      ),
      role: Number(
        (
          await db.query(
            "select count(*) from public.roles where company_id = $1 and system_key = 'dept_manager'",
            [company.id],
          )
        ).rows[0].count,
      ),
      scopes: (await db.query("select enum_range(null::public.role_scope)::text[] as v")).rows[0].v,
      feature: Number(
        (await db.query("select count(*) from public.features where key = 'departments'")).rows[0]
          .count,
      ),
    }));
    expect(out).toEqual({
      table: null,
      permission: 0,
      role: 0,
      scopes: ["company", "branch"],
      feature: 0,
    });
  });
});

describe("seven-day trial", () => {
  const start = (userId: string, companyId: string, plan = "growth") =>
    asUser(
      { userId },
      async (db) =>
        (await db.query("select public.start_trial($1, $2) as ends", [companyId, plan])).rows[0]
          .ends,
    );
  const refresh = (userId: string, companyId: string) =>
    asUser({ userId }, (db) => db.query("select public.refresh_subscription($1)", [companyId]));
  const overview = (userId: string, companyId: string) =>
    asUser(
      { userId },
      async (db) =>
        (await db.query("select public.subscription_overview($1) as o", [companyId])).rows[0].o,
    );

  it("lasts exactly seven days, needs no card, and grants the trial plan's features", async () => {
    const { owner, company } = await owned();
    await start(owner.id, company.id, "growth");
    const grant = await asAdmin(
      async (db) =>
        (
          await db.query(
            "select started_at, ends_at from public.trial_grants where company_id = $1",
            [company.id],
          )
        ).rows[0],
    );
    expect(new Date(grant.ends_at).getTime() - new Date(grant.started_at).getTime()).toBe(
      7 * 86_400_000,
    );
    const ctx = await asUser(
      { userId: owner.id },
      async (db) =>
        (await db.query("select public.workspace_context($1) as c", [company.slug])).rows[0].c,
    );
    expect(ctx.plan.code).toBe("growth");
    expect(ctx.subscription_status).toBe("trialing");
    expect(ctx.features.custom_roles.enabled).toBe(true);
    // Paid extras can't be bought into a trial.
    expect((await overview(owner.id, company.id)).allowances.staff).toBe(25);
  });

  it("only the owner can start it, once per workspace, once per owner every 12 months", async () => {
    const { owner, company } = await owned();
    const manager = await addMember(company, owner.id, ["employee"]);
    await expectDbError(start(manager.id, company.id), /not_authenticated/);
    await start(owner.id, company.id);
    await expectDbError(
      start(owner.id, company.id),
      /trial_not_eligible:workspace_already_trialled/,
    );

    const second = await createCompany(owner.id, "Second business");
    await expectDbError(start(owner.id, second.id), /trial_not_eligible:owner_trial_used/);
    // The second workspace still works on Free.
    const ctx = await asUser(
      { userId: owner.id },
      async (db) =>
        (await db.query("select public.workspace_context($1) as c", [second.slug])).rows[0].c,
    );
    expect(ctx.plan.code).toBe("free");

    const other = await createUser();
    const theirs = await createCompany(other.id);
    await start(other.id, theirs.id, "business");
  });

  it("only Starter, Growth or Business can be trialled", async () => {
    const { owner, company } = await owned();
    await expectDbError(start(owner.id, company.id, "free"), /trial_plan_invalid/);
    await expectDbError(start(owner.id, company.id, "scale"), /trial_plan_invalid/);
  });

  it("reminders are created once each (no duplicates)", async () => {
    const { owner, company } = await owned();
    await start(owner.id, company.id);
    await asAdmin((db) =>
      db.query(
        `update public.company_subscriptions set trial_ends_at = now() + interval '1 day 2 hours',
           current_period_end = now() + interval '1 day 2 hours' where company_id = $1`,
        [company.id],
      ),
    );
    await refresh(owner.id, company.id);
    await refresh(owner.id, company.id);
    const kinds = await asUser({ userId: owner.id }, async (db) =>
      (
        await db.query("select kind from public.notifications where company_id = $1 order by id", [
          company.id,
        ])
      ).rows.map((r) => r.kind),
    );
    expect(kinds.filter((k) => k === "trial_started")).toHaveLength(1);
    expect(kinds.filter((k) => k === "trial_1_day" || k === "trial_ends_today")).toHaveLength(1);
  });

  it("expiry with 5 active staff: falls back to Free, keeps every record, owner chooses 3, others paused", async () => {
    const { owner, company } = await owned();
    await start(owner.id, company.id, "starter");
    const ids = await addStaff(company, owner.id, 5);
    // A staff member who signs in with only the Staff Member role.
    const worker = await addMember(company, owner.id, ["employee"]);
    await asAdmin((db) =>
      db.query("update public.employees set member_id = $1 where id = $2", [
        worker.memberId,
        ids[4],
      ]),
    );

    await asAdmin((db) =>
      db.query(
        "update public.company_subscriptions set trial_ends_at = now() - interval '1 minute' where company_id = $1",
        [company.id],
      ),
    );
    // Entitlements drop immediately, even before the expiry is recorded.
    const ctx = await asUser(
      { userId: owner.id },
      async (db) =>
        (await db.query("select public.workspace_context($1) as c", [company.slug])).rows[0].c,
    );
    expect(ctx.plan.code).toBe("free");
    await refresh(owner.id, company.id);
    await refresh(owner.id, company.id); // idempotent

    const o = await overview(owner.id, company.id);
    expect(o.plan_code).toBe("free");
    expect(o.staff_selection_required).toBe(true);
    expect(o.usage.active_staff).toBe(5); // nothing silently deactivated
    expect(o.trial.outcome).toBe("expired");
    await expectDbError(addStaff(company, owner.id, 1, "New"), /staff_limit_exceeded:3/);

    // Choosing more than the allowance is refused.
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("select public.select_active_staff($1, $2)", [company.id, ids.slice(0, 4)]),
      ),
      /too_many_selected:3/,
    );
    await asUser({ userId: owner.id }, (db) =>
      db.query("select public.select_active_staff($1, $2)", [company.id, ids.slice(0, 3)]),
    );
    const after = await overview(owner.id, company.id);
    expect(after.usage.active_staff).toBe(3);
    expect(after.usage.paused_staff).toBe(2);
    expect(after.staff_selection_required).toBe(false);
    const total = await asAdmin(async (db) =>
      Number(
        (
          await db.query("select count(*) from public.employees where company_id = $1", [
            company.id,
          ])
        ).rows[0].count,
      ),
    );
    expect(total).toBe(5); // all records preserved

    // The paused staff member loses access; their record stays.
    const access = await asUser(
      { userId: worker.id },
      async (db) =>
        (await db.query("select id from public.companies where id = $1", [company.id])).rowCount,
    );
    expect(access).toBe(0);

    // Reactivation is blocked on Free, allowed after upgrading.
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query("select public.reactivate_staff($1, $2)", [company.id, ids.slice(3)]),
      ),
      /staff_limit_exceeded:3/,
    );
    await setSubscription(company.id, { plan: "starter" });
    await asUser({ userId: owner.id }, (db) =>
      db.query("select public.reactivate_staff($1, $2)", [company.id, ids.slice(3)]),
    );
    expect(await activeStaff(company.id)).toBe(5);
    const back = await asUser(
      { userId: worker.id },
      async (db) =>
        (await db.query("select id from public.companies where id = $1", [company.id])).rowCount,
    );
    expect(back).toBe(1);
  });
});

describe("downgrades", () => {
  it("Business → Free with more than 3 active staff requires choosing who stays", async () => {
    const { owner, company } = await owned();
    await setSubscription(company.id, { plan: "business" });
    const ids = await addStaff(company, owner.id, 6);
    const change = () =>
      asUser(
        { userId: owner.id },
        async (db) =>
          (await db.query("select public.change_to_lower_plan($1, 'free') as r", [company.id]))
            .rows[0].r,
      );
    await expectDbError(change(), /staff_selection_required:3/);
    await asUser({ userId: owner.id }, (db) =>
      db.query("select public.select_active_staff($1, $2, 'free')", [company.id, ids.slice(0, 3)]),
    );
    expect(await change()).toBe("applied");
    expect(await activeStaff(company.id)).toBe(3);
  });

  it("a paid plan with a paid period is downgraded at the end of the period", async () => {
    const { owner, company } = await owned();
    await setSubscription(company.id, {
      plan: "growth",
      periodEnd: new Date(Date.now() + 5 * 86_400_000).toISOString(),
    });
    await addStaff(company, owner.id, 12);
    const r = await asUser(
      { userId: owner.id },
      async (db) =>
        (await db.query("select public.change_to_lower_plan($1, 'starter') as r", [company.id]))
          .rows[0].r,
    );
    expect(r).toBe("scheduled");
    // Period ends: the change applies and selection is flagged (12 > 10).
    await asAdmin((db) =>
      db.query(
        "update public.company_subscriptions set pending_change_at = now() - interval '1 minute' where company_id = $1",
        [company.id],
      ),
    );
    await asUser({ userId: owner.id }, (db) =>
      db.query("select public.refresh_subscription($1)", [company.id]),
    );
    const o = await asUser(
      { userId: owner.id },
      async (db) =>
        (await db.query("select public.subscription_overview($1) as o", [company.id])).rows[0].o,
    );
    expect(o.plan_code).toBe("starter");
    expect(o.staff_selection_required).toBe(true);
    expect(o.usage.active_staff).toBe(12);
  });

  it("customers can't change their subscription row directly", async () => {
    const { owner, company } = await owned();
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query(
          "update public.company_subscriptions set extra_staff = 100 where company_id = $1",
          [company.id],
        ),
      ),
      /permission denied/,
    );
  });
});

describe("prices and checkout", () => {
  const dbQuote = (plan: string, interval: string, staff: number, locs: number) =>
    asAdmin(
      async (db) =>
        (
          await db.query(
            "select public.subscription_quote($1, $2::public.billing_interval, $3, $4) as q",
            [plan, interval, staff, locs],
          )
        ).rows[0].q,
    );

  it.each([
    ["starter", "monthly", 0, 3, 800_000], // ₦5,000 + 3 × ₦1,000 = ₦8,000
    ["growth", "monthly", 0, 4, 1_400_000], // ₦10,000 + 4 × ₦1,000 = ₦14,000
    ["business", "monthly", 1, 1, 1_700_000], // ₦15,000 + ₦1,000 + ₦1,000
    ["starter", "annual", 2, 1, 8_600_000], // ₦50,000 + 2 × ₦12,000 + ₦12,000
    ["growth", "annual", 0, 0, 10_000_000],
    ["business", "annual", 3, 2, 21_000_000], // ₦150,000 + 3 × ₦12,000 + 2 × ₦12,000
    ["free", "monthly", 0, 2, 200_000], // Free can add work locations
  ] as const)(
    "%s %s with %i extra staff and %i extra locations",
    async (plan, interval, s, l, total) => {
      expect(Number((await dbQuote(plan, interval, s, l)).total_minor)).toBe(total);
      expect(quote(plan, interval, s, l).totalMinor).toBe(total); // the interface agrees
    },
  );

  it("Free can't buy extra staff; Scale can't be bought", async () => {
    await expectDbError(dbQuote("free", "monthly", 1, 0), /extra_staff_not_available/);
    await expectDbError(dbQuote("scale", "monthly", 0, 0), /plan_invalid/);
    await expectDbError(dbQuote("free", "annual", 0, 0), /interval_not_available/);
  });

  it("checkout creates an open invoice priced by the server and grants nothing", async () => {
    const { owner, company } = await owned();
    const id = await asUser(
      { userId: owner.id },
      async (db) =>
        (
          await db.query(
            "select public.create_checkout_invoice($1, 'growth', 'monthly', 0, 2) as id",
            [company.id],
          )
        ).rows[0].id,
    );
    const inv = await asUser(
      { userId: owner.id },
      async (db) =>
        (
          await db.query("select status, total_minor from public.billing_invoices where id = $1", [
            id,
          ])
        ).rows[0],
    );
    expect(inv).toEqual({ status: "open", total_minor: "1200000" });
    const ctx = await asUser(
      { userId: owner.id },
      async (db) =>
        (await db.query("select public.workspace_context($1) as c", [company.slug])).rows[0].c,
    );
    expect(ctx.plan.code).toBe("free"); // unpaid ⇒ no paid entitlements
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query(
          "update public.billing_invoices set status = 'paid', paid_at = now() where id = $1",
          [id],
        ),
      ),
      /permission denied/,
    );
  });

  it("custom domains are not offered on any plan", async () => {
    const enabled = await asAdmin(
      async (db) =>
        (
          await db.query(
            "select count(*) from public.plan_features where feature_key = 'custom_domains' and enabled",
          )
        ).rows[0].count,
    );
    expect(Number(enabled)).toBe(0);
  });
});

describe("verified payments (Stage 2 groundwork; test fixture uses the service role)", () => {
  it("activates the paid plan only for the exact amount, once, and converts a trial", async () => {
    const { asService } = await import("./helpers");
    const { owner, company } = await owned();
    await asUser({ userId: owner.id }, (db) =>
      db.query("select public.start_trial($1, 'starter')", [company.id]),
    );
    const inv = await asUser(
      { userId: owner.id },
      async (db) =>
        (
          await db.query(
            "select public.create_checkout_invoice($1, 'starter', 'monthly', 2, 1) as id",
            [company.id],
          )
        ).rows[0].id,
    );
    const pay = (amount: number, ref: string) =>
      asService(
        async (db) =>
          (
            await db.query(
              "select public.apply_verified_payment($1, 'paystack', $2, $3, 'NGN', '{}') as r",
              [inv, ref, amount],
            )
          ).rows[0].r,
      );
    // Unique per run: provider references are unique across the database.
    const ref = `ref-${randomUUID()}`;
    expect(await pay(100, `${ref}-short`)).toBe("amount_mismatch");
    expect(await pay(800_000, ref)).toBe("applied"); // ₦5,000 + 2 × ₦1,000 + ₦1,000
    expect(await pay(800_000, ref)).toBe("already_applied"); // duplicate webhook
    const o = await asUser(
      { userId: owner.id },
      async (db) =>
        (await db.query("select public.subscription_overview($1) as o", [company.id])).rows[0].o,
    );
    expect(o.plan_code).toBe("starter");
    expect(o.status).toBe("active");
    expect(o.allowances.staff).toBe(12);
    expect(o.allowances.work_locations).toBe(3);
    expect(o.trial.outcome).toBe("converted");
  });

  it("customers can't apply payments themselves", async () => {
    const { owner, company } = await owned();
    await expectDbError(
      asUser({ userId: owner.id }, (db) =>
        db.query(
          "select public.apply_verified_payment(gen_random_uuid(), 'paystack', 'x', 1, 'NGN', '{}')",
          [],
        ),
      ),
      /permission denied/,
    );
    void company;
  });

  it("a Free workspace can pay for an extra work location", async () => {
    const { asService } = await import("./helpers");
    const { owner, company } = await owned();
    const inv = await asUser(
      { userId: owner.id },
      async (db) =>
        (
          await db.query(
            "select public.create_checkout_invoice($1, 'free', 'monthly', 0, 1) as id",
            [company.id],
          )
        ).rows[0].id,
    );
    await asService((db) =>
      db.query("select public.apply_verified_payment($1, 'paystack', $2, 100000, 'NGN', '{}')", [
        inv,
        `free-loc-${inv}`,
      ]),
    );
    const o = await asUser(
      { userId: owner.id },
      async (db) =>
        (await db.query("select public.subscription_overview($1) as o", [company.id])).rows[0].o,
    );
    expect(o.plan_code).toBe("free");
    expect(o.allowances.work_locations).toBe(2);
    expect(o.allowances.staff).toBe(3);
  });
});
