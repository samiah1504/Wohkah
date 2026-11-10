import type { Metadata } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/display";
import { CreateCompanyForm } from "@/modules/workspace/components/create-company-form";
import { env } from "@/lib/env";

export const metadata: Metadata = { title: "Create a workspace" };

export default function OnboardingPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Set up your company workspace</CardTitle>
          <CardDescription>
            You&apos;ll be the owner. You start on the Free plan (up to 3 employees) and can upgrade
            at any time. You can change these details later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <CreateCompanyForm rootDomain={env.appUrl.replace(/^https?:\/\//, "")} />
        </CardContent>
      </Card>
    </div>
  );
}
