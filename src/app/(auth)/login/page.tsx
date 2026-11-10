import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, Alert, Skeleton } from "@/components/ui/display";
import { LoginForm } from "@/modules/identity/components/auth-forms";
import { getSessionUser, safeNextPath } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = {
  link_invalid: "That link is invalid or has expired. Please request a new one.",
};

export default function LoginPage(props: PageProps<"/login">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to your WOHKAH workspace.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Suspense fallback={<Skeleton className="h-64" />}>
          <LoginContent searchParams={props.searchParams} />
        </Suspense>
        <p className="text-center text-sm text-muted-foreground">
          New to WOHKAH?{" "}
          <Link href="/register" className="font-semibold text-walnut hover:underline">
            Create an account
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

async function LoginContent({
  searchParams,
}: {
  searchParams: PageProps<"/login">["searchParams"];
}) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next);
  if (await getSessionUser()) redirect(next);
  const error = typeof sp.error === "string" ? ERRORS[sp.error] : undefined;
  return (
    <>
      {error ? <Alert variant="destructive">{error}</Alert> : null}
      <LoginForm next={next} defaultEmail={typeof sp.email === "string" ? sp.email : undefined} />
    </>
  );
}
