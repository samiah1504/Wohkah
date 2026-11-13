import { Suspense } from "react";
import { PageHeader } from "@/components/shell/page-header";
import { SettingsTabs, type SettingsTab } from "@/components/shell/settings-tabs";
import { can, type Permission } from "@/lib/permissions";
import { requireTenant } from "@/lib/tenancy";

const SETTINGS_SECTIONS: { key: string; label: string; anyOf: Permission[] | null }[] = [
  { key: "company", label: "Company", anyOf: null },
  { key: "departments", label: "Departments", anyOf: ["departments.manage"] },
  { key: "branches", label: "Branches", anyOf: ["branches.manage"] },
  { key: "work-locations", label: "Work locations", anyOf: ["work_locations.manage"] },
  { key: "holidays", label: "Holidays", anyOf: ["holidays.manage"] },
  { key: "subscription", label: "Subscription", anyOf: ["subscription.view"] },
  { key: "audit", label: "Audit log", anyOf: ["audit.view"] },
];

export default function SettingsLayout({ children, params }: LayoutProps<"/w/[slug]/settings">) {
  return (
    <>
      <PageHeader title="Settings" description="Workspace configuration." className="mb-4" />
      <Suspense fallback={<div className="mb-6 h-10" />}>
        <Tabs params={params} />
      </Suspense>
      {children}
    </>
  );
}

async function Tabs({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const ctx = await requireTenant(slug);
  const tabs: SettingsTab[] = SETTINGS_SECTIONS.filter(
    (s) => s.anyOf === null || s.anyOf.some((p) => can(ctx, p)),
  ).map((s) => ({ label: s.label, href: `/w/${slug}/settings/${s.key}` }));
  return <SettingsTabs tabs={tabs} />;
}
