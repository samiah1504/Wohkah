"use client";

import { XIcon } from "lucide-react";
import { ActionDialog } from "@/components/action-forms";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/form-controls";
import { cancelContract } from "../server/actions";

export function CancelContract({ slug, id, draft }: { slug: string; id: string; draft: boolean }) {
  return (
    <ActionDialog
      title="Cancel this document?"
      description={
        draft
          ? "The draft is kept in the history but can't be sent."
          : "Nobody can sign it after this. Signatures already given stay in its history."
      }
      action={cancelContract}
      hidden={{ slug, id }}
      submitLabel="Cancel document"
      trigger={
        <Button variant="ghost" size="sm">
          <XIcon /> Cancel
        </Button>
      }
    >
      {() => (
        <Field label="Reason (optional)" htmlFor="reason">
          <Textarea id="reason" name="reason" rows={2} maxLength={300} />
        </Field>
      )}
    </ActionDialog>
  );
}
