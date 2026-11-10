import type { Metadata } from "next";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/display";
import { ForgotPasswordForm } from "@/modules/identity/components/auth-forms";

export const metadata: Metadata = { title: "Reset your password" };

export default function ForgotPasswordPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-2xl">Reset your password</CardTitle>
        <CardDescription>
          Enter the email you sign in with and we&apos;ll send you a link to choose a new password.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <ForgotPasswordForm />
        <Link href="/login" className="text-center text-sm font-semibold text-walnut hover:underline">
          Back to sign in
        </Link>
      </CardContent>
    </Card>
  );
}
