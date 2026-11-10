"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { initialFormState } from "@/lib/forms";
import { acceptInvitation } from "../server/actions";

export function AcceptInvitationForm({ token, companyName }: { token: string; companyName: string }) {
  const [state, action] = useActionState(acceptInvitation, initialFormState);
  return (
    <form action={action} className="grid gap-3">
      <FormMessage state={state} />
      <input type="hidden" name="token" value={token} />
      <SubmitButton pendingLabel="Joining…">Accept and join {companyName}</SubmitButton>
    </form>
  );
}
