import type { Metadata } from "next";
import { NoAccess, TenantPage } from "@/components/shell/tenant-page";
import { SectionHub } from "@/components/shell/section-hub";
import { sectionFor } from "@/lib/navigation/server";

export const metadata: Metadata = { title: "Settings" };

/** Settings, grouped: Company, Team, Workplace and Account. */
export default function SettingsIndex(props: PageProps<"/w/[slug]/settings">) {
  return (
    <TenantPage params={props.params}>
      {async (ctx) => {
        const section = await sectionFor(ctx, "settings");
        return section ? <SectionHub section={section} header={false} /> : <NoAccess />;
      }}
    </TenantPage>
  );
}
