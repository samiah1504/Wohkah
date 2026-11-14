"use client";

import { useActionState, useRef, useState } from "react";
import { CopyIcon, FileUpIcon, SendIcon, ShuffleIcon } from "lucide-react";
import { toast } from "sonner";
import { ActionDialog } from "@/components/action-forms";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect } from "@/components/ui/form-controls";
import { FormMessage, SubmitButton } from "@/components/forms";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/overlays";
import { initialFormState } from "@/lib/forms";
import { DOCUMENT_CATEGORIES, STATUS_ACTIONS, type StaffStatus } from "@/lib/copy/staff";
import {
  changeStaffStatus,
  inviteToPortal,
  prepareDocumentUpload,
  saveDocument,
  type PortalInviteState,
} from "../server/actions";

// ---------------------------------------------------------------------------
// Change status
// ---------------------------------------------------------------------------
export function ChangeStatus({
  slug,
  id,
  name,
  status,
}: {
  slug: string;
  id: string;
  name: string;
  status: StaffStatus;
}) {
  const options = STATUS_ACTIONS[status] ?? [];
  const [choice, setChoice] = useState(options[0]?.to ?? "");
  if (!options.length) return null;
  const note = options.find((o) => o.to === choice)?.confirm;
  return (
    <ActionDialog
      title={`Change ${name}'s status`}
      action={changeStaffStatus}
      hidden={{ slug, id }}
      submitLabel="Change status"
      trigger={
        <Button variant="outline" size="sm">
          <ShuffleIcon /> Change status
        </Button>
      }
    >
      {() => (
        <fieldset className="grid gap-2">
          <legend className="sr-only">New status</legend>
          {options.map((o) => (
            <label
              key={o.to}
              className="has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-sm"
            >
              <input
                type="radio"
                name="status"
                value={o.to}
                checked={choice === o.to}
                onChange={() => setChoice(o.to)}
                className="accent-[var(--brand-yellow)]"
              />
              {o.label}
            </label>
          ))}
          {note ? <p className="text-muted-foreground text-xs">{note}</p> : null}
        </fieldset>
      )}
    </ActionDialog>
  );
}

// ---------------------------------------------------------------------------
// Invite to the staff portal
// ---------------------------------------------------------------------------
export function InviteToPortal({
  slug,
  id,
  email,
}: {
  slug: string;
  id: string;
  email: string | null;
}) {
  const [state, action] = useActionState<PortalInviteState, FormData>(
    inviteToPortal,
    initialFormState,
  );
  const [open, setOpen] = useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <SendIcon /> Invite to staff portal
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite to the staff portal</DialogTitle>
          <DialogDescription>
            They get their own sign-in to see their staff record. They can&apos;t change anything in
            it.
          </DialogDescription>
        </DialogHeader>
        {state.status === "success" ? (
          <div className="grid gap-3">
            <FormMessage state={state} />
            {state.inviteLink ? (
              <div className="flex gap-2">
                <Input
                  readOnly
                  value={state.inviteLink}
                  aria-label="Invitation link"
                  onFocus={(e) => e.currentTarget.select()}
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    await navigator.clipboard.writeText(state.inviteLink!);
                    toast.success("Link copied.");
                  }}
                >
                  <CopyIcon /> Copy
                </Button>
              </div>
            ) : null}
            <div className="flex justify-end">
              <Button type="button" onClick={() => setOpen(false)}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form action={action} className="grid gap-4">
            <input type="hidden" name="slug" value={slug} />
            <input type="hidden" name="id" value={id} />
            <FormMessage state={state} />
            <p className="text-sm">
              {email ? (
                <>
                  We&apos;ll send the invitation to <strong>{email}</strong>.
                </>
              ) : (
                "Add their email address to their record first; the invitation is sent there."
              )}
            </p>
            <div className="flex justify-end">
              <SubmitButton pendingLabel="Sending…">Send invitation</SubmitButton>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Upload a document
// ---------------------------------------------------------------------------
export function UploadDocument({ slug, employeeId }: { slug: string; employeeId: string }) {
  const [state, action] = useActionState(saveDocument, initialFormState);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [path, setPath] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    if (path) return; // already uploaded: let the form submit normally
    event.preventDefault();
    setError(null);
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    setUploading(true);
    try {
      const prepared = await prepareDocumentUpload({
        slug,
        employeeId,
        fileName: file.name,
        size: file.size,
        type: file.type,
      });
      if (!prepared.ok) {
        setError(prepared.message);
        return;
      }
      const res = await fetch(prepared.url, {
        method: "PUT",
        headers: { "content-type": file.type, "x-upsert": "false" },
        body: file,
      });
      if (!res.ok) {
        setError("The upload didn't finish. Check your connection and try again.");
        return;
      }
      setPath(prepared.path);
      // Submit again now that the file is stored.
      queueMicrotask(() => formRef.current?.requestSubmit());
    } finally {
      setUploading(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) {
          setFile(null);
          setPath("");
          setError(null);
        }
      }}
    >
      <DialogTrigger asChild>
        <Button size="sm">
          <FileUpIcon /> Add document
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a document</DialogTitle>
          <DialogDescription>
            PDF, Word document or photo, up to 10 MB. Stored privately.
          </DialogDescription>
        </DialogHeader>
        <form ref={formRef} action={action} onSubmit={upload} className="grid gap-4">
          <input type="hidden" name="slug" value={slug} />
          <input type="hidden" name="employeeId" value={employeeId} />
          <input type="hidden" name="path" value={path} />
          {error ? (
            <p role="alert" className="text-destructive text-sm font-medium">
              {error}
            </p>
          ) : null}
          <FormMessage state={state} />
          <Field label="File" htmlFor="doc-file">
            <input
              id="doc-file"
              type="file"
              accept=".pdf,.doc,.docx,image/jpeg,image/png,image/webp"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setPath("");
                const nameInput = formRef.current?.elements.namedItem(
                  "name",
                ) as HTMLInputElement | null;
                if (f && nameInput && !nameInput.value)
                  nameInput.value = f.name.replace(/\.[^.]+$/, "");
              }}
              className="file:bg-subtle file:text-walnut text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-sm file:font-semibold"
            />
          </Field>
          <Field label="Name" htmlFor="doc-name">
            <Input
              id="doc-name"
              name="name"
              maxLength={150}
              placeholder="For example Employment letter"
            />
          </Field>
          <Field label="Type" htmlFor="doc-category">
            <NativeSelect id="doc-category" name="category" defaultValue="contract">
              {Object.entries(DOCUMENT_CATEGORIES).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <div className="flex justify-end">
            <Button type="submit" disabled={uploading}>
              {uploading ? "Uploading…" : "Upload"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
