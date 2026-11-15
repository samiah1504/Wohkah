import type { Metadata } from "next";
import { NoAccess, TenantPage } from "@/components/shell/tenant-page";
import { SectionHub } from "@/components/shell/section-hub";
import { sectionFor } from "@/lib/navigation/server";

export const metadata: Metadata = { title: "People" };

export default function PeoplePage(props: PageProps<"/w/[slug]/people">) {
  return (
    <TenantPage params={props.params}>
      {async (ctx) => {
        const section = await sectionFor(ctx, "people");
        return section ? <SectionHub section={section} /> : <NoAccess />;
      }}
    </TenantPage>
  );
}
