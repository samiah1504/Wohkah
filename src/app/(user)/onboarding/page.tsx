import type { Metadata } from "next";
import { Suspense } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@/components/ui/display";
import { CreateCompanyForm } from "@/modules/workspace/components/create-company-form";
import { env } from "@/lib/env";
import { getPlan } from "@/lib/plans/catalog";

export const metadata: Metadata = { title: "Create your business account" };

export default function OnboardingPage(props: PageProps<"/onboarding">) {
  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create your business account</CardTitle>
          <CardDescription>
            You&apos;ll be the owner. Start on the Free plan, or try a paid plan free for 7 days
            with no card. You can change these details later.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<Skeleton className="h-96" />}>
            <Form searchParams={props.searchParams} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}

async function Form({ searchParams }: { searchParams: PageProps<"/onboarding">["searchParams"] }) {
  const sp = await searchParams;
  const plan = typeof sp.plan === "string" ? getPlan(sp.plan)?.code : undefined;
  return (
    <CreateCompanyForm
      rootDomain={env.appUrl.replace(/^https?:\/\//, "")}
      defaultPlan={plan ?? "free"}
    />
  );
}
