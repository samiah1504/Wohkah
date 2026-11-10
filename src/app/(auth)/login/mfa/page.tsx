import type { Metadata } from "next";
import { Suspense } from "react";
import { ShieldCheckIcon } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@/components/ui/display";
import { MfaChallengeForm } from "@/modules/identity/components/auth-forms";
import { requireUser, safeNextPath } from "@/lib/auth/session";
import { signOut } from "@/modules/identity/server/actions";

export const metadata: Metadata = { title: "Two-step verification" };

export default function MfaPage(props: PageProps<"/login/mfa">) {
  return (
    <Card>
      <CardHeader>
        <ShieldCheckIcon className="text-primary size-10" aria-hidden />
        <CardTitle className="text-2xl">Two-step verification</CardTitle>
        <CardDescription>Enter the 6-digit code from your authenticator app.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <Suspense fallback={<Skeleton className="h-32" />}>
          <Challenge searchParams={props.searchParams} />
        </Suspense>
        <form action={signOut} className="text-center">
          <button
            type="submit"
            className="text-muted-foreground text-sm font-medium hover:underline"
          >
            Use a different account
          </button>
        </form>
      </CardContent>
    </Card>
  );
}

async function Challenge({
  searchParams,
}: {
  searchParams: PageProps<"/login/mfa">["searchParams"];
}) {
  const sp = await searchParams;
  const next = safeNextPath(sp.next);
  await requireUser(`/login/mfa?next=${encodeURIComponent(next)}`);
  return <MfaChallengeForm next={next} />;
}
