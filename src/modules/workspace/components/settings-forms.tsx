"use client";

import { useActionState } from "react";
import { PencilIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, NativeSelect, Textarea } from "@/components/ui/form-controls";
import { ActionDialog } from "@/components/action-forms";
import { FormMessage, SubmitButton, errorProps, useSuccessToast } from "@/components/forms";
import { initialFormState, type FormState } from "@/lib/forms";
import { COUNTRIES, CURRENCIES, INDUSTRIES, SIZE_BANDS, TIMEZONES, WEEKDAYS } from "../constants";
import {
  addHoliday,
  saveBranch,
  saveDepartment,
  saveWorkLocation,
  updateCompanyProfile,
} from "../server/actions";

type Address = {
  line1?: string;
  line2?: string;
  city?: string;
  state?: string;
  postal_code?: string;
};

function AddressFields({ state, address }: { state: FormState; address: Address }) {
  const v = state.values ?? {};
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Field
        label="Address line 1"
        htmlFor="addressLine1"
        error={state.fieldErrors?.addressLine1}
        className="sm:col-span-2"
      >
        <Input
          id="addressLine1"
          name="addressLine1"
          autoComplete="address-line1"
          defaultValue={v.addressLine1 ?? address.line1 ?? ""}
        />
      </Field>
      <Field
        label="Address line 2"
        htmlFor="addressLine2"
        error={state.fieldErrors?.addressLine2}
        className="sm:col-span-2"
      >
        <Input
          id="addressLine2"
          name="addressLine2"
          autoComplete="address-line2"
          defaultValue={v.addressLine2 ?? address.line2 ?? ""}
        />
      </Field>
      <Field label="City" htmlFor="city" error={state.fieldErrors?.city}>
        <Input
          id="city"
          name="city"
          autoComplete="address-level2"
          defaultValue={v.city ?? address.city ?? ""}
        />
      </Field>
      <Field label="State" htmlFor="state" error={state.fieldErrors?.state}>
        <Input
          id="state"
          name="state"
          autoComplete="address-level1"
          defaultValue={v.state ?? address.state ?? ""}
        />
      </Field>
      <Field label="Postal code" htmlFor="postalCode" error={state.fieldErrors?.postalCode}>
        <Input
          id="postalCode"
          name="postalCode"
          autoComplete="postal-code"
          defaultValue={v.postalCode ?? address.postal_code ?? ""}
        />
      </Field>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Company profile
// ---------------------------------------------------------------------------
export type CompanyProfile = {
  name: string;
  legal_name: string | null;
  business_email: string | null;
  phone: string | null;
  website: string | null;
  industry: string | null;
  size_band: string | null;
  country_code: string;
  currency: string;
  timezone: string;
  working_days: number[];
  work_start: string;
  work_end: string;
};

export function CompanyProfileForm({
  slug,
  company,
  address,
  canEdit,
}: {
  slug: string;
  company: CompanyProfile;
  address: Address;
  canEdit: boolean;
}) {
  const [state, action] = useActionState(updateCompanyProfile, initialFormState);
  useSuccessToast(state);
  const v = state.values ?? {};
  const days = new Set(company.working_days);

  return (
    <form action={action} className="grid gap-8" noValidate>
      <input type="hidden" name="slug" value={slug} />
      {state.status === "error" ? <FormMessage state={state} /> : null}
      <fieldset disabled={!canEdit} className="grid gap-8 disabled:opacity-80">
        <section className="grid gap-4">
          <h2 className="font-heading text-lg font-bold">Company details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company name" htmlFor="name" error={state.fieldErrors?.name}>
              <Input
                id="name"
                name="name"
                defaultValue={v.name ?? company.name}
                {...errorProps(state, "name")}
              />
            </Field>
            <Field
              label="Registered legal name"
              htmlFor="legalName"
              error={state.fieldErrors?.legalName}
            >
              <Input
                id="legalName"
                name="legalName"
                defaultValue={v.legalName ?? company.legal_name ?? ""}
              />
            </Field>
            <Field
              label="Business email"
              htmlFor="businessEmail"
              error={state.fieldErrors?.businessEmail}
            >
              <Input
                id="businessEmail"
                name="businessEmail"
                type="email"
                defaultValue={v.businessEmail ?? company.business_email ?? ""}
                {...errorProps(state, "businessEmail")}
              />
            </Field>
            <Field label="Phone" htmlFor="phone" error={state.fieldErrors?.phone}>
              <Input
                id="phone"
                name="phone"
                type="tel"
                defaultValue={v.phone ?? company.phone ?? ""}
              />
            </Field>
            <Field label="Website" htmlFor="website" error={state.fieldErrors?.website}>
              <Input
                id="website"
                name="website"
                type="url"
                placeholder="https://"
                defaultValue={v.website ?? company.website ?? ""}
                {...errorProps(state, "website")}
              />
            </Field>
            <Field label="Industry" htmlFor="industry" error={state.fieldErrors?.industry}>
              <NativeSelect
                id="industry"
                name="industry"
                defaultValue={v.industry ?? company.industry ?? ""}
              >
                <option value="">Choose…</option>
                {INDUSTRIES.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Company size" htmlFor="sizeBand" error={state.fieldErrors?.sizeBand}>
              <NativeSelect
                id="sizeBand"
                name="sizeBand"
                defaultValue={v.sizeBand ?? company.size_band ?? ""}
              >
                <option value="">Choose…</option>
                {SIZE_BANDS.map((s) => (
                  <option key={s} value={s}>
                    {s} staff
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
        </section>

        <section className="grid gap-4">
          <h2 className="font-heading text-lg font-bold">Address</h2>
          <AddressFields state={state} address={address} />
        </section>

        <section className="grid gap-4">
          <h2 className="font-heading text-lg font-bold">Location, currency and working time</h2>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Country" htmlFor="countryCode" error={state.fieldErrors?.countryCode}>
              <NativeSelect
                id="countryCode"
                name="countryCode"
                defaultValue={v.countryCode ?? company.country_code}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Currency" htmlFor="currency" error={state.fieldErrors?.currency}>
              <NativeSelect
                id="currency"
                name="currency"
                defaultValue={v.currency ?? company.currency}
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Time zone" htmlFor="timezone" error={state.fieldErrors?.timezone}>
              <NativeSelect
                id="timezone"
                name="timezone"
                defaultValue={v.timezone ?? company.timezone}
              >
                {TIMEZONES.map((t) => (
                  <option key={t} value={t}>
                    {t.replace("_", " ")}
                  </option>
                ))}
              </NativeSelect>
            </Field>
            <Field label="Work starts" htmlFor="workStart" error={state.fieldErrors?.workStart}>
              <Input
                id="workStart"
                name="workStart"
                type="time"
                defaultValue={v.workStart ?? company.work_start.slice(0, 5)}
                {...errorProps(state, "workStart")}
              />
            </Field>
            <Field label="Work ends" htmlFor="workEnd" error={state.fieldErrors?.workEnd}>
              <Input
                id="workEnd"
                name="workEnd"
                type="time"
                defaultValue={v.workEnd ?? company.work_end.slice(0, 5)}
                {...errorProps(state, "workEnd")}
              />
            </Field>
          </div>
          <fieldset className="grid gap-2">
            <legend className="mb-1 text-sm font-medium">Working days</legend>
            <div className="flex flex-wrap gap-2">
              {WEEKDAYS.map((d) => (
                <label
                  key={d.value}
                  className="bg-surface has-[:checked]:border-primary has-[:checked]:bg-primary/10 flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="workingDays"
                    value={d.value}
                    defaultChecked={days.has(d.value)}
                    className="accent-[var(--brand-yellow)]"
                  />
                  {d.short}
                </label>
              ))}
            </div>
            {state.fieldErrors?.workingDays ? (
              <p role="alert" className="text-destructive text-xs font-medium">
                {state.fieldErrors.workingDays}
              </p>
            ) : null}
          </fieldset>
        </section>
      </fieldset>
      {canEdit ? (
        <div>
          <SubmitButton pendingLabel="Saving…">Save changes</SubmitButton>
        </div>
      ) : (
        <p className="text-muted-foreground text-sm">
          You can view these settings. Ask an owner to change them.
        </p>
      )}
    </form>
  );
}

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------
type Dept = { id: string; name: string; description: string | null; parent_id: string | null };

export function DepartmentDialog({
  slug,
  department,
  departments,
  disabledReason,
}: {
  slug: string;
  department?: Dept;
  departments: Dept[];
  disabledReason?: string;
}) {
  const parents = departments.filter((d) => d.id !== department?.id);
  return (
    <ActionDialog
      title={department ? "Edit department" : "Add a department"}
      action={saveDepartment}
      hidden={{ slug, id: department?.id ?? "" }}
      trigger={
        department ? (
          <Button variant="ghost" size="sm" aria-label={`Edit ${department.name}`}>
            <PencilIcon /> Edit
          </Button>
        ) : (
          <Button disabled={Boolean(disabledReason)} title={disabledReason}>
            <PlusIcon /> Add department
          </Button>
        )
      }
    >
      {(state) => (
        <>
          <Field label="Name" htmlFor="dept-name" error={state.fieldErrors?.name}>
            <Input
              id="dept-name"
              name="name"
              defaultValue={state.values?.name ?? department?.name ?? ""}
              autoFocus
              {...errorProps(state, "name")}
            />
          </Field>
          <Field
            label="Part of"
            htmlFor="dept-parent"
            hint="Optional: place it under another department."
            error={state.fieldErrors?.parentId}
          >
            <NativeSelect
              id="dept-parent"
              name="parentId"
              defaultValue={state.values?.parentId ?? department?.parent_id ?? ""}
            >
              <option value="">— Top level —</option>
              {parents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </NativeSelect>
          </Field>
          <Field
            label="Description"
            htmlFor="dept-description"
            error={state.fieldErrors?.description}
          >
            <Textarea
              id="dept-description"
              name="description"
              rows={3}
              defaultValue={state.values?.description ?? department?.description ?? ""}
            />
          </Field>
        </>
      )}
    </ActionDialog>
  );
}

// ---------------------------------------------------------------------------
// Branches
// ---------------------------------------------------------------------------
type Branch = {
  id: string;
  name: string;
  code: string | null;
  phone: string | null;
  is_headquarters: boolean;
  address: Address;
};

export function BranchDialog({
  slug,
  branch,
  disabledReason,
}: {
  slug: string;
  branch?: Branch;
  disabledReason?: string;
}) {
  // Keep the dialog mounted even when the plan limit is reached: saving the
  // last allowed branch flips the page to "at limit", and unmounting here
  // would swallow the success confirmation.
  return (
    <ActionDialog
      title={branch ? "Edit branch" : "Add a branch"}
      action={saveBranch}
      hidden={{ slug, id: branch?.id ?? "" }}
      trigger={
        branch ? (
          <Button variant="ghost" size="sm" aria-label={`Edit ${branch.name}`}>
            <PencilIcon /> Edit
          </Button>
        ) : (
          <Button disabled={Boolean(disabledReason)} title={disabledReason}>
            <PlusIcon /> Add branch
          </Button>
        )
      }
    >
      {(state) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="branch-name" error={state.fieldErrors?.name}>
              <Input
                id="branch-name"
                name="name"
                defaultValue={state.values?.name ?? branch?.name ?? ""}
                autoFocus
                {...errorProps(state, "name")}
              />
            </Field>
            <Field
              label="Code"
              htmlFor="branch-code"
              hint="Optional short code, e.g. LOS-HQ"
              error={state.fieldErrors?.code}
            >
              <Input
                id="branch-code"
                name="code"
                defaultValue={state.values?.code ?? branch?.code ?? ""}
                {...errorProps(state, "code")}
              />
            </Field>
            <Field label="Phone" htmlFor="branch-phone" error={state.fieldErrors?.phone}>
              <Input
                id="branch-phone"
                name="phone"
                type="tel"
                defaultValue={state.values?.phone ?? branch?.phone ?? ""}
              />
            </Field>
            <label className="flex items-center gap-2 self-end pb-2 text-sm">
              <input
                type="checkbox"
                name="isHeadquarters"
                defaultChecked={branch?.is_headquarters ?? false}
                className="accent-[var(--brand-yellow)]"
              />
              Head office
            </label>
          </div>
          <AddressFields state={state} address={branch?.address ?? {}} />
        </>
      )}
    </ActionDialog>
  );
}

// ---------------------------------------------------------------------------
// Work locations
// ---------------------------------------------------------------------------
type WorkLocation = { id: string; name: string; branch_id: string | null; address: Address };

export function WorkLocationDialog({
  slug,
  location,
  branches,
  disabledReason,
}: {
  slug: string;
  location?: WorkLocation;
  branches: { id: string; name: string }[];
  disabledReason?: string;
}) {
  return (
    <ActionDialog
      title={location ? "Edit work location" : "Add a work location"}
      description="An approved place where staff can clock in."
      action={saveWorkLocation}
      hidden={{ slug, id: location?.id ?? "" }}
      trigger={
        location ? (
          <Button variant="ghost" size="sm" aria-label={`Edit ${location.name}`}>
            <PencilIcon /> Edit
          </Button>
        ) : (
          <Button disabled={Boolean(disabledReason)} title={disabledReason}>
            <PlusIcon /> Add work location
          </Button>
        )
      }
    >
      {(state) => (
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name" htmlFor="location-name" error={state.fieldErrors?.name}>
              <Input
                id="location-name"
                name="name"
                defaultValue={state.values?.name ?? location?.name ?? ""}
                placeholder="e.g. Ikeja shop"
                autoFocus
                {...errorProps(state, "name")}
              />
            </Field>
            <Field label="Branch" htmlFor="location-branch" hint="Optional">
              <NativeSelect
                id="location-branch"
                name="branchId"
                defaultValue={state.values?.branchId ?? location?.branch_id ?? ""}
              >
                <option value="">No branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </NativeSelect>
            </Field>
          </div>
          <AddressFields state={state} address={location?.address ?? {}} />
        </>
      )}
    </ActionDialog>
  );
}

// ---------------------------------------------------------------------------
// Holidays
// ---------------------------------------------------------------------------
export function HolidayForm({
  slug,
  branches,
}: {
  slug: string;
  branches: { id: string; name: string }[];
}) {
  const [state, action] = useActionState(addHoliday, initialFormState);
  useSuccessToast(state);
  return (
    <form
      action={action}
      className="grid gap-4 sm:grid-cols-[160px_1fr_200px_auto] sm:items-end"
      noValidate
    >
      <input type="hidden" name="slug" value={slug} />
      <Field label="Date" htmlFor="holidayDate" error={state.fieldErrors?.holidayDate}>
        <Input
          id="holidayDate"
          name="holidayDate"
          type="date"
          required
          defaultValue={state.status === "error" ? state.values?.holidayDate : ""}
          {...errorProps(state, "holidayDate")}
        />
      </Field>
      <Field label="Holiday" htmlFor="holiday-name" error={state.fieldErrors?.name}>
        <Input
          id="holiday-name"
          name="name"
          placeholder="e.g. Independence Day"
          required
          defaultValue={state.status === "error" ? state.values?.name : ""}
          {...errorProps(state, "name")}
        />
      </Field>
      <Field label="Applies to" htmlFor="holiday-branch" error={state.fieldErrors?.branchId}>
        <NativeSelect id="holiday-branch" name="branchId" defaultValue="">
          <option value="">All branches</option>
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </NativeSelect>
      </Field>
      <SubmitButton pendingLabel="Adding…">
        <PlusIcon /> Add
      </SubmitButton>
      {state.status === "error" && !state.fieldErrors ? (
        <div className="sm:col-span-4">
          <FormMessage state={state} />
        </div>
      ) : null}
    </form>
  );
}
