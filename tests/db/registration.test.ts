/**
 * Sign-up details: the database trigger stores names, phone, acquisition
 * source, terms acceptance and marketing consent, checks every value itself,
 * and keeps the answers private to the person.
 */
import { randomUUID } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { asAdmin, asUser, createUser, expectDbError, pool, uid } from "./helpers";

afterAll(() => pool.end());

async function signUp(meta: Record<string, unknown>) {
  const id = randomUUID();
  await asAdmin((db) =>
    db.query(
      `insert into auth.users (id, aud, role, email, email_confirmed_at, raw_user_meta_data)
       values ($1, 'authenticated', 'authenticated', $2, now(), $3)`,
      [id, `signup-${uid()}@test.wohkah.local`, meta],
    ),
  );
  return id;
}

async function rows(id: string) {
  return asAdmin(async (db) => ({
    profile: (
      await db.query(
        "select full_name, first_name, last_name, phone from public.profiles where id = $1",
        [id],
      )
    ).rows[0],
    reg: (await db.query("select * from public.user_registrations where user_id = $1", [id]))
      .rows[0],
  }));
}

describe("registration details", () => {
  it("stores names, E.164 phone, source, terms and marketing consent with database timestamps", async () => {
    const id = await signUp({
      full_name: "Ada Okafor",
      first_name: "Ada",
      last_name: "Okafor",
      phone: "+2348031234567",
      acquisition_source: "instagram",
      terms_accepted: true,
      terms_version: "2026-11-14",
      marketing_consent: true,
    });
    const { profile, reg } = await rows(id);
    expect(profile).toEqual({
      full_name: "Ada Okafor",
      first_name: "Ada",
      last_name: "Okafor",
      phone: "+2348031234567",
    });
    expect(reg.acquisition_source).toBe("instagram");
    expect(reg.acquisition_detail).toBeNull();
    expect(reg.terms_accepted_at).toBeInstanceOf(Date);
    expect(reg.terms_version).toBe("2026-11-14");
    expect(reg.marketing_consent).toBe(true);
    expect(reg.marketing_consent_at).toBeInstanceOf(Date);
  });

  it("records marketing consent separately: unticked means no consent", async () => {
    const id = await signUp({
      first_name: "Bayo",
      last_name: "Ade",
      terms_accepted: true,
      marketing_consent: false,
    });
    const { profile, reg } = await rows(id);
    expect(profile.full_name).toBe("Bayo Ade");
    expect(reg.terms_accepted_at).toBeInstanceOf(Date);
    expect(reg.marketing_consent).toBe(false);
    expect(reg.marketing_consent_at).toBeNull();
  });

  it("keeps the 'Other' detail only for Other, and rejects unknown values", async () => {
    const other = await signUp({
      acquisition_source: "other",
      acquisition_detail: "A radio advert",
      terms_accepted: true,
    });
    expect((await rows(other)).reg.acquisition_detail).toBe("A radio advert");

    const bad = await signUp({
      phone: "08031234567", // not E.164
      acquisition_source: "billboard",
      acquisition_detail: "ignored",
      terms_accepted: "yes", // only the boolean true counts
    });
    const { profile, reg } = await rows(bad);
    expect(profile.phone).toBeNull();
    expect(reg.acquisition_source).toBeNull();
    expect(reg.acquisition_detail).toBeNull();
    expect(reg.terms_accepted_at).toBeNull();
  });

  it("existing accounts and admin-created users still get a profile", async () => {
    const { id } = await createUser({ fullName: "Legacy User" });
    const { profile, reg } = await rows(id);
    expect(profile.full_name).toBe("Legacy User");
    expect(reg.terms_accepted_at).toBeNull();
  });

  it("only the person can read their answers, and nobody can change them from the app", async () => {
    const mine = await signUp({ acquisition_source: "tiktok", terms_accepted: true });
    const other = await createUser();
    const own = await asUser(
      { userId: mine },
      async (db) =>
        (await db.query("select acquisition_source from public.user_registrations")).rows,
    );
    expect(own).toEqual([{ acquisition_source: "tiktok" }]);
    const theirs = await asUser(
      { userId: other.id },
      async (db) =>
        (await db.query("select * from public.user_registrations where user_id = $1", [mine])).rows,
    );
    expect(theirs).toEqual([]);
    await expectDbError(
      asUser({ userId: mine }, (db) =>
        db.query("update public.user_registrations set marketing_consent = true"),
      ),
      /permission denied/,
    );
    await expectDbError(
      asUser({ userId: other.id }, (db) =>
        db.query("insert into public.user_registrations (user_id) values ($1)", [other.id]),
      ),
      /permission denied/,
    );
  });
});
