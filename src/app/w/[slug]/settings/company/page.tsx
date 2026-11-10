import type { Metadata } from "next";
import { TenantPage } from "@/components/shell/tenant-page";
import { Card, CardContent } from "@/components/ui/display";
import { can } from "@/lib/permissions";
import { asAddress, getCompanyProfile } from "@/modules/workspace/server/queries";
import { CompanyProfileForm } from "@/modules/workspace/components/settings-forms";

export const metadata: Metadata = { title: "Company settings" };

export default function CompanySettingsPage(props: PageProps<"/w/[slug]/settings/company">) {
  return (
    <TenantPage params={props.params}>
      {async (ctx) => {
        const company = await getCompanyProfile(ctx);
        return (
          <Card>
            <CardContent>
              <CompanyProfileForm
                slug={ctx.company.slug}
                company={company}
                address={asAddress(company.address)}
                canEdit={can(ctx, "company.settings.manage")}
              />
            </CardContent>
          </Card>
        );
      }}
    </TenantPage>
  );
}
