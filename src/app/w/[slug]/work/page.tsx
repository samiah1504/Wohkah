import type { Metadata } from "next";
import { NoAccess, TenantPage } from "@/components/shell/tenant-page";
import { SectionHub } from "@/components/shell/section-hub";
import { sectionFor } from "@/lib/navigation/server";

export const metadata: Metadata = { title: "Work" };

export default function WorkPage(props: PageProps<"/w/[slug]/work">) {
  return (
    <TenantPage params={props.params}>
      {async (ctx) => {
        const section = await sectionFor(ctx, "work");
        return section ? <SectionHub section={section} /> : <NoAccess />;
      }}
    </TenantPage>
  );
}
