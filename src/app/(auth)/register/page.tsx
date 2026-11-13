import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@/components/ui/display";
import { RegisterForm } from "@/modules/identity/components/auth-forms";
import { getSessionUser, safeNextPath } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create your account" };

export default function RegisterPage(props: PageProps<"/register">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>
          One login for every business you work with. Free for up to 3 staff.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Suspense fallback={<Skeleton className="h-80" />}>
          <RegisterContent searchParams={props.searchParams} />
        </Suspense>
        <p className="text-muted-foreground text-center text-sm">
          Already have an account?{" "}
          <Link href="/login" className="text-walnut font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

async function RegisterContent({
  searchParams,
}: {
  searchParams: PageProps<"/register">["searchParams"];
}) {
  const sp = await searchParams;
  // Pricing-page links carry the chosen plan through to workspace setup.
  const plan =
    typeof sp.plan === "string" && /^(free|starter|growth|business)$/.test(sp.plan)
      ? sp.plan
      : null;
  const next = safeNextPath(sp.next, plan ? `/onboarding?plan=${plan}` : "/onboarding");
  if (await getSessionUser()) redirect(next);
  return (
    <RegisterForm next={next} defaultEmail={typeof sp.email === "string" ? sp.email : undefined} />
  );
}
