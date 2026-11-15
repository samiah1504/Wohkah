import "server-only";
import type { TenantContext } from "@/lib/tenancy";
import { getMyStaffRecordId } from "@/modules/staff/server/queries";
import { navigationFor, type SectionKey } from "./index";

/** The navigation for this person, and one section of it (null when not theirs). */
export async function sectionFor(ctx: TenantContext, key: SectionKey) {
  const sections = navigationFor({
    slug: ctx.company.slug,
    permissions: ctx.permissions,
    hasStaffRecord: Boolean(await getMyStaffRecordId(ctx)),
  });
  return sections.find((s) => s.key === key) ?? null;
}
