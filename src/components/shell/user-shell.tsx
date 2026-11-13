import Link from "next/link";
import { Suspense } from "react";
import { Logo, CriftAttribution } from "@/components/brand/logo";
import { Skeleton } from "@/components/ui/display";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { UserMenu } from "./user-menu";

/** Layout for signed-in pages outside a workspace (workspaces, onboarding, account). */
export function UserShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-surface border-b">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between px-4 sm:px-6">
          <Link href="/workspaces" aria-label="Your businesses">
            <Logo />
          </Link>
          <Suspense fallback={<Skeleton className="size-8 rounded-full" />}>
            <CurrentUserMenu />
          </Suspense>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">{children}</main>
      <footer className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6">
        <CriftAttribution />
      </footer>
    </div>
  );
}

export async function getProfileName(userId: string): Promise<string> {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
  return data?.full_name ?? "";
}

async function CurrentUserMenu() {
  const user = await requireUser();
  const name = await getProfileName(user.id);
  return <UserMenu name={name} email={user.email} />;
}
