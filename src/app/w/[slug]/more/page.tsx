import type { Metadata } from "next";
import { NoAccess, TenantPage } from "@/components/shell/tenant-page";
import { SectionHub } from "@/components/shell/section-hub";
import { sectionFor } from "@/lib/navigation/server";

export const metadata: Metadata = { title: "More" };

export default function MorePage(props: PageProps<"/w/[slug]/more">) {
  return (
    <TenantPage params={props.params}>
      {async (ctx) => {
        const section = await sectionFor(ctx, "more");
        return section ? <SectionHub section={section} /> : <NoAccess />;
      }}
    </TenantPage>
  );
}
