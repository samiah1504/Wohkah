import { isSupabaseConfigured } from "@/lib/env";
import { Alert } from "@/components/ui/display";

/**
 * Honest configuration notice: when Supabase isn't configured, sign-in can't
 * work, so say so instead of showing forms that silently fail.
 */
export function SetupNotice() {
  if (isSupabaseConfigured()) return null;
  return (
    <Alert variant="info" className="mb-4">
      <p className="font-semibold">Setup required</p>
      <p className="mt-1">
        Authentication requires Supabase configuration. Set NEXT_PUBLIC_SUPABASE_URL and
        NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (see .env.example and DEPLOYMENT.md).
      </p>
    </Alert>
  );
}
