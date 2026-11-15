import type { Metadata } from "next";
import { NoAccess, TenantPage } from "@/components/shell/tenant-page";
import { SectionHub } from "@/components/shell/section-hub";
import { sectionFor } from "@/lib/navigation/server";

export const metadata: Metadata = { title: "Attendance" };

export default function AttendancePage(props: PageProps<"/w/[slug]/attendance">) {
  return (
    <TenantPage params={props.params}>
      {async (ctx) => {
        const section = await sectionFor(ctx, "attendance");
        return section ? <SectionHub section={section} /> : <NoAccess />;
      }}
    </TenantPage>
  );
}
