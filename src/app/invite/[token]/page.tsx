import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { MailWarningIcon } from "lucide-react";
import { Logo, CriftAttribution } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@/components/ui/display";
import { getSessionUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/dates";
import { AcceptInvitationForm } from "@/modules/access/components/accept-invitation";
import { signOut } from "@/modules/identity/server/actions";

export const metadata: Metadata = { title: "Workspace invitation", robots: { index: false } };

export default function InvitePage(props: PageProps<"/invite/[token]">) {
  return (
    <div className="flex min-h-screen flex-col items-center px-4 py-10 sm:py-16">
      <Link href="/" aria-label="WOHKAH home" className="mb-8">
        <Logo withTagline />
      </Link>
      <main className="w-full max-w-md">
        <Suspense fallback={<Skeleton className="h-72" />}>
          <Invitation params={props.params} />
        </Suspense>
      </main>
      <footer className="mt-auto pt-10">
        <CriftAttribution />
      </footer>
    </div>
  );
}

async function Invitation({ params }: { params: PageProps<"/invite/[token]">["params"] }) {
  const { token } = await params;
  if (!isSupabaseConfigured() || !/^[A-Za-z0-9_-]{20,100}$/.test(token)) return <Invalid />;

  const supabase = await createClient();
  const { data } = await supabase.rpc("invitation_preview", { p_token: token });
  const invite = data?.[0];
  if (!invite) return <Invalid />;

  const user = await getSessionUser();
  const next = `/invite/${token}`;
  const emailMatches = user && user.email.toLowerCase() === invite.email.toLowerCase();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Join {invite.company_name}</CardTitle>
        <CardDescription>
          You&apos;ve been invited to the {invite.company_name} workspace on WOHKAH. This invitation
          is for <strong className="text-foreground">{invite.email}</strong> and expires on{" "}
          {formatDate(invite.expires_at.slice(0, 10))}.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {!user ? (
          <>
            <Button asChild>
              <Link
                href={`/register?next=${encodeURIComponent(next)}&email=${encodeURIComponent(invite.email)}`}
              >
                Create your account
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link
                href={`/login?next=${encodeURIComponent(next)}&email=${encodeURIComponent(invite.email)}`}
              >
                I already have a WOHKAH account
              </Link>
            </Button>
          </>
        ) : emailMatches ? (
          <AcceptInvitationForm token={token} companyName={invite.company_name} />
        ) : (
          <>
            <p className="text-sm">
              You&apos;re signed in as <strong>{user.email}</strong>. Sign out and sign in as{" "}
              <strong>{invite.email}</strong> to accept this invitation.
            </p>
            <form action={signOut}>
              <Button type="submit" variant="outline" className="w-full">
                Sign out
              </Button>
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Invalid() {
  return (
    <Card>
      <CardHeader>
        <MailWarningIcon className="text-warning size-10" aria-hidden />
        <CardTitle className="text-2xl">This invitation isn&apos;t valid</CardTitle>
        <CardDescription>
          It may have expired, been used already, or been withdrawn. Ask the person who invited you
          to send a new one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button asChild variant="outline">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
