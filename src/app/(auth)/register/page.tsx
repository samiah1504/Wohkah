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
          One account for every workspace you belong to. Free for teams of up to 3.
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
  const next = safeNextPath(sp.next, "/onboarding");
  if (await getSessionUser()) redirect(next);
  return (
    <RegisterForm next={next} defaultEmail={typeof sp.email === "string" ? sp.email : undefined} />
  );
}
