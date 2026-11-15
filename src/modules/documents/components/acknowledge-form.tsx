"use client";

import { useActionState } from "react";
import { FormMessage, SubmitButton } from "@/components/forms";
import { initialFormState } from "@/lib/forms";
import { acknowledgeJobDescription } from "../server/actions";

export function AcknowledgeForm({ slug, versionId }: { slug: string; versionId: string }) {
  const [state, action] = useActionState(acknowledgeJobDescription, initialFormState);
  return (
    <form action={action} className="grid gap-2">
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="versionId" value={versionId} />
      {state.status === "error" ? <FormMessage state={state} /> : null}
      <SubmitButton pendingLabel="Saving…">I&apos;ve read it and understand</SubmitButton>
    </form>
  );
}
