/**
 * Catalog-driven guard rails. These inspect the database itself, so they cover
 * tables and functions added in future migrations automatically.
 */
import { afterAll, describe, expect, it } from "vitest";
import { asAdmin, pool } from "./helpers";

afterAll(() => pool.end());

/** Tables anonymous visitors may read (public pricing catalogue). */
const ANON_READABLE = new Set(["features", "subscription_plans", "plan_features"]);

describe("RLS coverage", () => {
  it("has RLS enabled on every table in the public schema", async () => {
    const rows = await asAdmin(async (db) =>
      (
        await db.query<{ relname: string }>(
          `select c.relname
           from pg_class c join pg_namespace n on n.oid = c.relnamespace
           where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity
           order by 1`,
        )
      ).rows.map((r) => r.relname),
    );
    expect(rows, "tables without RLS").toEqual([]);
  });

  it("gives anon no privileges outside the public pricing catalogue", async () => {
    const rows = await asAdmin(
      async (db) =>
        (
          await db.query<{ table_name: string; privilege_type: string }>(
            `select table_name, privilege_type
           from information_schema.role_table_grants
           where grantee = 'anon' and table_schema = 'public'
           union
           select table_name, privilege_type
           from information_schema.column_privileges
           where grantee = 'anon' and table_schema = 'public'`,
          )
        ).rows,
    );
    const offending = rows.filter(
      (r) => !(ANON_READABLE.has(r.table_name) && r.privilege_type === "SELECT"),
    );
    expect(offending, "unexpected anon privileges").toEqual([]);
  });

  it("has at least one policy on every tenant table (tables with company_id)", async () => {
    const rows = await asAdmin(async (db) =>
      (
        await db.query<{ table_name: string }>(
          `select distinct c.table_name
           from information_schema.columns c
           join information_schema.tables t
             on t.table_schema = c.table_schema and t.table_name = c.table_name
           where c.table_schema = 'public' and c.column_name = 'company_id'
             and t.table_type = 'BASE TABLE'
             and not exists (
               select 1 from pg_policies p
               where p.schemaname = 'public' and p.tablename = c.table_name
             )`,
        )
      ).rows.map((r) => r.table_name),
    );
    expect(rows, "tenant tables without policies").toEqual([]);
  });

  it("pins search_path on every SECURITY DEFINER function in public and app", async () => {
    const rows = await asAdmin(async (db) =>
      (
        await db.query<{ fn: string }>(
          `select n.nspname || '.' || p.proname as fn
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname in ('public', 'app') and p.prosecdef
             and not exists (
               select 1 from unnest(coalesce(p.proconfig, '{}')) cfg where cfg like 'search_path=%'
             )`,
        )
      ).rows.map((r) => r.fn),
    );
    expect(rows, "SECURITY DEFINER functions without a fixed search_path").toEqual([]);
  });

  it("does not let anon execute any function in the public schema except the invitation preview", async () => {
    const rows = await asAdmin(async (db) =>
      (
        await db.query<{ fn: string }>(
          `select p.proname as fn
           from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public'
             and has_function_privilege('anon', p.oid, 'execute')`,
        )
      ).rows.map((r) => r.fn),
    );
    expect(rows.sort()).toEqual(["invitation_preview"]);
  });

  it("keeps the private app schema out of reach of anon", async () => {
    const hasUsage = await asAdmin(
      async (db) =>
        (
          await db.query<{ ok: boolean }>(
            "select has_schema_privilege('anon', 'app', 'usage') as ok",
          )
        ).rows[0]!.ok,
    );
    expect(hasUsage).toBe(false);
  });
});
