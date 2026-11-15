import type { Metadata } from "next";
import { NoAccess, TenantPage } from "@/components/shell/tenant-page";
import { SectionHub } from "@/components/shell/section-hub";
import { sectionFor } from "@/lib/navigation/server";

export const metadata: Metadata = { title: "Salaries" };

export default function SalariesPage(props: PageProps<"/w/[slug]/salaries">) {
  return (
    <TenantPage params={props.params}>
      {async (ctx) => {
        const section = await sectionFor(ctx, "salaries");
        return section ? <SectionHub section={section} /> : <NoAccess />;
      }}
    </TenantPage>
  );
}
