import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/shell/page-header";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Skeleton,
} from "@/components/ui/display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import {
  ChangePasswordForm,
  MfaSettings,
  ProfileForm,
} from "@/modules/identity/components/account-forms";

export const metadata: Metadata = { title: "Account and security" };

export default function AccountPage() {
  return (
    <>
      <PageHeader
        title="Account and security"
        description="Your personal login, shared across every workspace you belong to."
      />
      <div className="grid gap-6">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <AccountSections />
        </Suspense>
      </div>
    </>
  );
}

const EVENT_LABELS: Record<string, string> = {
  signup: "Account created",
  login_success: "Signed in",
  login_failure: "Failed sign-in",
  logout: "Signed out",
  password_reset_requested: "Password reset requested",
  password_reset_completed: "Password changed",
  mfa_enrolled: "Two-step verification turned on",
  mfa_unenrolled: "Two-step verification turned off",
  mfa_challenge_failed: "Wrong two-step code",
  rate_limited: "Too many attempts",
};

async function AccountSections() {
  const user = await requireUser("/account");
  const supabase = await createClient();
  const [{ data: profile }, { data: factors }, { data: events }] = await Promise.all([
    supabase.from("profiles").select("full_name, phone").eq("id", user.id).single(),
    supabase.auth.mfa.listFactors(),
    supabase
      .from("login_events")
      .select("id, event, ip, user_agent, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);
  const verified = factors?.totp.find((f) => f.status === "verified") ?? null;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Your name is visible to colleagues in workspaces you share.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm fullName={profile?.full_name ?? ""} phone={profile?.phone ?? null} email={user.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Two-step verification</CardTitle>
        </CardHeader>
        <CardContent>
          <MfaSettings verifiedFactorId={verified?.id ?? null} sessionAal={user.aal} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent sign-in activity</CardTitle>
          <CardDescription>If something here wasn&apos;t you, change your password now.</CardDescription>
        </CardHeader>
        <CardContent>
          {events && events.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event</TableHead>
                  <TableHead>When</TableHead>
                  <TableHead className="hidden sm:table-cell">IP address</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {events.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell>{EVENT_LABELS[e.event] ?? e.event}</TableCell>
                    <TableCell className="whitespace-nowrap">
                      {new Date(e.created_at).toLocaleString("en-GB", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </TableCell>
                    <TableCell className="hidden font-mono text-xs sm:table-cell">
                      {(e.ip as string | null) ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <p className="text-sm text-muted-foreground">No activity recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </>
  );
}
