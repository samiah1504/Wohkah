import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MailCheckIcon } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/display";

export const metadata: Metadata = { title: "Check your email" };

export default function CheckEmailPage(props: PageProps<"/register/check-email">) {
  return (
    <Card>
      <CardHeader>
        <MailCheckIcon className="size-10 text-primary" aria-hidden />
        <CardTitle className="text-2xl">Check your email</CardTitle>
        <CardDescription>
          <Suspense fallback="We've sent you a confirmation link.">
            <Recipient searchParams={props.searchParams} />
          </Suspense>
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3 text-sm text-muted-foreground">
        <p>Open the link in the email to confirm your address and finish setting up your account.</p>
        <p>Can&apos;t find it? Check your spam folder. The link expires in 24 hours.</p>
        <Link href="/login" className="font-semibold text-walnut hover:underline">
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}

async function Recipient({
  searchParams,
}: {
  searchParams: PageProps<"/register/check-email">["searchParams"];
}) {
  const { email } = await searchParams;
  return typeof email === "string" && email.length < 200
    ? `We've sent a confirmation link to ${email}.`
    : "We've sent you a confirmation link.";
}
