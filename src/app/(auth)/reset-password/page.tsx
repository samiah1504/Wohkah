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
import { ResetPasswordForm } from "@/modules/identity/components/auth-forms";
import { requireUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Choose a new password</CardTitle>
        <CardDescription>You&apos;ll use it the next time you sign in.</CardDescription>
      </CardHeader>
      <CardContent>
        <Suspense fallback={<Skeleton className="h-48" />}>
          <Guarded />
        </Suspense>
      </CardContent>
    </Card>
  );
}

async function Guarded() {
  // The reset link signs the user in; without that session this page is useless.
  await requireUser("/reset-password");
  return <ResetPasswordForm />;
}
