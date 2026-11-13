/**
 * Database security test harness.
 *
 * Queries run exactly as PostgREST runs them for a signed-in user: inside a
 * transaction, with `SET LOCAL ROLE authenticated` and the JWT claims in
 * `request.jwt.claims`. RLS, column privileges and triggers therefore apply
 * for real.
 *
 * Targets:
 *  - locally: plain PostgreSQL prepared by `pnpm db:local:reset`
 *    (default connection: unix socket, database wohkah_test)
 *  - CI: the Supabase stack from `supabase start`
 *    (DATABASE_URL=postgresql://postgres:postgres@127.0.0.1:54322/postgres)
 */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import pg from "pg";

const connectionString =
  process.env.DATABASE_URL ?? "postgresql://root@localhost/wohkah_test?host=/var/run/postgresql";

if (/prod/i.test(connectionString)) {
  throw new Error("Refusing to run database tests against a production-looking database.");
}

export const pool = new pg.Pool({ connectionString, max: 4 });

export type Db = pg.PoolClient;
export type Session = { userId: string; aal?: "aal1" | "aal2" };

/** Run as the database owner (setup only: simulates migrations/billing, never a user). */
export async function asAdmin<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

async function asRole<T>(
  role: "authenticated" | "anon" | "service_role",
  claims: Record<string, unknown>,
  fn: (db: Db) => Promise<T>,
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query(`set local role ${role}`);
    await client.query("select set_config('request.jwt.claims', $1, true)", [
      JSON.stringify(claims),
    ]);
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (err) {
    await client.query("rollback");
    throw err;
  } finally {
    client.release();
  }
}

/** Run as a signed-in user (API role `authenticated`). */
export function asUser<T>(session: Session, fn: (db: Db) => Promise<T>): Promise<T> {
  return asRole(
    "authenticated",
    { sub: session.userId, role: "authenticated", aal: session.aal ?? "aal1" },
    fn,
  );
}

/** Run as a visitor who is not signed in (API role `anon`). */
export function asAnon<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  return asRole("anon", { role: "anon" }, fn);
}

/** Run as the WOHKAH server's service role. */
export function asService<T>(fn: (db: Db) => Promise<T>): Promise<T> {
  return asRole("service_role", { role: "service_role" }, fn);
}

/** Unique suffix so test runs never collide (tests share one database). */
export function uid(): string {
  return randomUUID().slice(0, 8);
}

export async function createUser(
  opts: { email?: string; fullName?: string; confirmed?: boolean } = {},
): Promise<{ id: string; email: string }> {
  const id = randomUUID();
  const email = opts.email ?? `user-${uid()}@test.wohkah.local`;
  await asAdmin((db) =>
    db.query(
      `insert into auth.users (id, aud, role, email, email_confirmed_at, raw_user_meta_data)
       values ($1, 'authenticated', 'authenticated', $2, $3, $4)`,
      [
        id,
        email,
        opts.confirmed === false ? null : new Date(),
        { full_name: opts.fullName ?? `Test ${email.split("@")[0]}` },
      ],
    ),
  );
  return { id, email };
}

export type Company = { id: string; slug: string };

export async function createCompany(ownerId: string, name = "Test Co"): Promise<Company> {
  const slug = `t-${uid()}`;
  const id = await asUser({ userId: ownerId }, async (db) => {
    const res = await db.query<{ id: string }>("select public.create_company($1, $2) as id", [
      name,
      slug,
    ]);
    return res.rows[0]!.id;
  });
  return { id, slug };
}

/** Simulates the billing system moving a company to another plan. */
export async function setPlan(companyId: string, planCode: string): Promise<void> {
  await asAdmin((db) =>
    db.query(
      `update public.company_subscriptions
         set plan_id = (select id from public.subscription_plans where code = $2)
       where company_id = $1`,
      [companyId, planCode],
    ),
  );
}

export function newToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: createHash("sha256").update(token, "utf8").digest("hex") };
}

/**
 * Businesses define their own roles; only Owner is built in. Tests use these
 * sample roles (created on first use, like a business owner would) with the
 * access the former starter roles had.
 */
export const SAMPLE_ROLES: Record<string, { name: string; permissions: string[] }> = {
  hr_admin: {
    name: "Staff Manager",
    permissions: [
      "holidays.manage",
      "members.view",
      "members.invite",
      "members.manage",
      "roles.view",
      "roles.assign",
      "staff.view",
      "staff.manage",
    ],
  },
  ops_manager: {
    name: "Operations Manager",
    permissions: [
      "branches.manage",
      "holidays.manage",
      "members.view",
      "staff.view",
      "work_locations.manage",
    ],
  },
  accountant: {
    name: "Accountant",
    permissions: ["members.view", "subscription.view", "staff.view"],
  },
  employee: { name: "Staff Member", permissions: [] },
};

/** The Owner role, or a sample role created on first use. */
export async function roleId(companyId: string, key: string): Promise<string> {
  return asAdmin(async (db) => {
    if (key === "owner") {
      const r = await db.query<{ id: string }>(
        "select id from public.roles where company_id = $1 and system_key = 'owner'",
        [companyId],
      );
      return r.rows[0]!.id;
    }
    const sample = SAMPLE_ROLES[key];
    if (!sample) throw new Error(`Unknown sample role ${key}`);
    const existing = await db.query<{ id: string }>(
      "select id from public.roles where company_id = $1 and name = $2",
      [companyId, sample.name],
    );
    if (existing.rows[0]) return existing.rows[0].id;
    const created = await db.query<{ id: string }>(
      "insert into public.roles (company_id, name) values ($1, $2) returning id",
      [companyId, sample.name],
    );
    const id = created.rows[0]!.id;
    for (const permission of sample.permissions) {
      await db.query(
        "insert into public.role_permissions (company_id, role_id, permission_key) values ($1, $2, $3)",
        [companyId, id, permission],
      );
    }
    return id;
  });
}

/**
 * Add a person to a company through the real invitation flow: the inviter
 * creates the invitation (RLS + guards apply), the invitee accepts it.
 */
export async function addMember(
  company: Company,
  inviterId: string,
  systemKeys: string[] = ["employee"],
): Promise<{ id: string; email: string; memberId: string }> {
  const user = await createUser();
  const roleIds = await Promise.all(systemKeys.map((k) => roleId(company.id, k)));
  const { token, hash } = newToken();
  await asUser({ userId: inviterId }, (db) =>
    db.query(
      `insert into public.company_invitations (company_id, email, role_ids, token_hash)
       values ($1, $2, $3, $4)`,
      [company.id, user.email, roleIds, hash],
    ),
  );
  await asUser({ userId: user.id }, (db) =>
    db.query("select public.accept_invitation($1)", [token]),
  );
  const memberId = await asAdmin(async (db) => {
    const r = await db.query<{ id: string }>(
      "select id from public.company_members where company_id = $1 and user_id = $2",
      [company.id, user.id],
    );
    return r.rows[0]!.id;
  });
  return { ...user, memberId };
}

/** Expect a promise to fail with a Postgres error whose message matches. */
export async function expectDbError(p: Promise<unknown>, match: RegExp): Promise<void> {
  let error: unknown;
  try {
    await p;
  } catch (e) {
    error = e;
  }
  if (!error) throw new Error(`Expected a database error matching ${match}, but it succeeded`);
  const message = (error as Error).message;
  if (!match.test(message)) {
    throw new Error(`Expected error matching ${match}, got: ${message}`);
  }
}
