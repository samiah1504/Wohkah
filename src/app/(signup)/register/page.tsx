import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Skeleton } from "@/components/ui/display";
import { RegisterForm } from "@/modules/identity/components/register-form";
import { getSessionUser, safeNextPath } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create your account" };

export default function RegisterPage(props: PageProps<"/register">) {
  return (
    <>
      <h1 className="font-heading text-walnut text-3xl font-extrabold tracking-tight sm:text-4xl">
        Create your account
      </h1>
      <p className="text-muted-foreground mt-2 text-base leading-relaxed">
        Start your 7-day free trial and experience a better way to manage your business and your
        people.
      </p>
      <div className="mt-8">
        <Suspense fallback={<Skeleton className="h-[36rem]" />}>
          <RegisterContent searchParams={props.searchParams} />
        </Suspense>
      </div>
      <p className="text-muted-foreground mt-6 text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-walnut font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}

async function RegisterContent({
  searchParams,
}: {
  searchParams: PageProps<"/register">["searchParams"];
}) {
  const sp = await searchParams;
  // Pricing-page links carry the chosen plan through to business setup. Without
  // one, setup starts with the 7-day trial of the recommended plan selected
  // (the owner can still choose Free; trial rules are checked in the database).
  const plan =
    typeof sp.plan === "string" && /^(free|starter|growth|business)$/.test(sp.plan)
      ? sp.plan
      : "growth";
  const next = safeNextPath(sp.next, `/onboarding?plan=${plan}`);
  if (await getSessionUser()) redirect(next);
  return (
    <RegisterForm next={next} defaultEmail={typeof sp.email === "string" ? sp.email : undefined} />
  );
}
