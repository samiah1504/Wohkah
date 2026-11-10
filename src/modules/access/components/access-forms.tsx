"use client";

import { useActionState, useEffect, useEffectEvent, useRef, useState } from "react";
import { toast } from "sonner";
import { CopyIcon, PencilIcon, PlusIcon, ShieldIcon, UserPlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/form-controls";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/overlays";
import { ActionDialog } from "@/components/action-forms";
import { FormMessage, SubmitButton, errorProps } from "@/components/forms";
import { initialFormState } from "@/lib/forms";
import {
  inviteMember,
  saveRole,
  setMemberRoles,
  setRolePermissions,
  type InviteState,
} from "../server/actions";

export type RoleOption = {
  id: string;
  name: string;
  systemKey: string | null;
  description?: string | null;
};

function RoleCheckboxes({ roles, selected }: { roles: RoleOption[]; selected: string[] }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-medium">Roles</legend>
      {roles.map((r) => (
        <label
          key={r.id}
          className="has-[:checked]:border-primary has-[:checked]:bg-primary/5 flex cursor-pointer items-start gap-3 rounded-lg border p-3"
        >
          <input
            type="checkbox"
            name="roleIds"
            value={r.id}
            defaultChecked={selected.includes(r.id)}
            className="mt-0.5 accent-[var(--brand-yellow)]"
          />
          <span>
            <span className="block text-sm font-medium">{r.name}</span>
            {r.description ? (
              <span className="text-muted-foreground block text-xs">{r.description}</span>
            ) : null}
          </span>
        </label>
      ))}
    </fieldset>
  );
}

// ---------------------------------------------------------------------------
// Invite (shows a copyable link when email isn't configured)
// ---------------------------------------------------------------------------
export function InviteDialog({ slug, roles }: { slug: string; roles: RoleOption[] }) {
  const [open, setOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (o) setFormKey((k) => k + 1);
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlusIcon /> Invite people
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite someone to this workspace</DialogTitle>
          <DialogDescription>
            They&apos;ll get a link to join. If they already have a WOHKAH account, they can use the
            same login.
          </DialogDescription>
        </DialogHeader>
        <InviteForm key={formKey} slug={slug} roles={roles} onDone={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

function InviteForm({
  slug,
  roles,
  onDone,
}: {
  slug: string;
  roles: RoleOption[];
  onDone: () => void;
}) {
  const [state, action] = useActionState<InviteState, FormData>(inviteMember, initialFormState);
  const employee = roles.find((r) => r.systemKey === "employee");

  // Handle each result exactly once, even if onDone changes identity.
  const handled = useRef<InviteState | null>(null);
  const done = useEffectEvent(() => onDone());
  useEffect(() => {
    if (state.status === "success" && !state.inviteLink && handled.current !== state) {
      handled.current = state;
      if (state.message) toast.success(state.message);
      done();
    }
  }, [state]);

  if (state.status === "success" && state.inviteLink) {
    return (
      <div className="grid gap-4">
        <FormMessage state={state} />
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
        <p className="text-muted-foreground text-xs">
          The link works once, only for that email address, and expires in 7 days.
        </p>
        <div className="flex justify-end">
          <Button type="button" onClick={onDone}>
            Done
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form action={action} className="grid gap-4" noValidate>
      {state.status === "error" ? <FormMessage state={state} /> : null}
      <input type="hidden" name="slug" value={slug} />
      <Field label="Email address" htmlFor="invite-email" error={state.fieldErrors?.email}>
        <Input
          id="invite-email"
          name="email"
          type="email"
          autoComplete="off"
          autoFocus
          defaultValue={state.values?.email}
          {...errorProps(state, "email")}
        />
      </Field>
      <RoleCheckboxes roles={roles} selected={employee ? [employee.id] : []} />
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Inviting…">Send invitation</SubmitButton>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Member roles
// ---------------------------------------------------------------------------
export function MemberRolesDialog({
  slug,
  memberId,
  memberName,
  roles,
  currentRoleIds,
}: {
  slug: string;
  memberId: string;
  memberName: string;
  roles: RoleOption[];
  currentRoleIds: string[];
}) {
  return (
    <ActionDialog
      title={`Roles for ${memberName}`}
      description="Roles decide what this person can see and do in the workspace."
      action={setMemberRoles}
      hidden={{ slug, memberId }}
      trigger={
        <Button variant="ghost" size="sm">
          <ShieldIcon /> Roles
        </Button>
      }
    >
      {() => <RoleCheckboxes roles={roles} selected={currentRoleIds} />}
    </ActionDialog>
  );
}

// ---------------------------------------------------------------------------
// Custom roles
// ---------------------------------------------------------------------------
export function RoleDialog({
  slug,
  role,
}: {
  slug: string;
  role?: { id: string; name: string; description: string | null };
}) {
  return (
    <ActionDialog
      title={role ? "Edit role" : "Create a custom role"}
      description={role ? undefined : "After creating it, choose its permissions."}
      action={saveRole}
      hidden={{ slug, roleId: role?.id ?? "" }}
      trigger={
        role ? (
          <Button variant="ghost" size="sm">
            <PencilIcon /> Rename
          </Button>
        ) : (
          <Button>
            <PlusIcon /> Create role
          </Button>
        )
      }
    >
      {(state) => (
        <>
          <Field label="Role name" htmlFor="role-name" error={state.fieldErrors?.name}>
            <Input
              id="role-name"
              name="name"
              autoFocus
              defaultValue={state.values?.name ?? role?.name ?? ""}
              {...errorProps(state, "name")}
            />
          </Field>
          <Field
            label="Description"
            htmlFor="role-description"
            error={state.fieldErrors?.description}
          >
            <Textarea
              id="role-description"
              name="description"
              rows={2}
              defaultValue={state.values?.description ?? role?.description ?? ""}
            />
          </Field>
        </>
      )}
    </ActionDialog>
  );
}

export type PermissionOption = {
  key: string;
  module: string;
  description: string;
  isSensitive: boolean;
  heldByMe: boolean;
};

export function RolePermissionsDialog({
  slug,
  roleId,
  roleName,
  catalog,
  granted,
}: {
  slug: string;
  roleId: string;
  roleName: string;
  catalog: PermissionOption[];
  granted: string[];
}) {
  const modules = [...new Set(catalog.map((p) => p.module))];
  return (
    <ActionDialog
      title={`Permissions for ${roleName}`}
      description="You can only grant permissions you hold yourself."
      action={setRolePermissions}
      hidden={{ slug, roleId }}
      trigger={
        <Button variant="outline" size="sm">
          Edit permissions
        </Button>
      }
    >
      {() => (
        <div className="grid max-h-[55vh] gap-4 overflow-y-auto pr-1">
          {modules.map((m) => (
            <fieldset key={m} className="grid gap-2">
              <legend className="text-muted-foreground mb-1 text-xs font-semibold tracking-wide uppercase">
                {m}
              </legend>
              {catalog
                .filter((p) => p.module === m)
                .map((p) => (
                  <label
                    key={p.key}
                    className="flex items-start gap-3 text-sm aria-disabled:opacity-50"
                    aria-disabled={!p.heldByMe}
                  >
                    {/* Disabled inputs aren't submitted: keep permissions the editor can't change. */}
                    {!p.heldByMe && granted.includes(p.key) ? (
                      <input type="hidden" name="permissions" value={p.key} />
                    ) : null}
                    <input
                      type="checkbox"
                      name="permissions"
                      value={p.key}
                      defaultChecked={granted.includes(p.key)}
                      disabled={!p.heldByMe}
                      className="mt-0.5 accent-[var(--brand-yellow)]"
                    />
                    <span>
                      {p.description}
                      {p.isSensitive ? (
                        <span className="text-warning ml-1 text-xs font-semibold">Sensitive</span>
                      ) : null}
                    </span>
                  </label>
                ))}
            </fieldset>
          ))}
        </div>
      )}
    </ActionDialog>
  );
}
