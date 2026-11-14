"use client";

import { useRouter } from "next/navigation";
import { useRef } from "react";
import { SearchIcon } from "lucide-react";
import { Input, NativeSelect } from "@/components/ui/form-controls";

/** Search box and branch filter. A plain GET form, so it also works before scripts load. */
export function StaffToolbar({
  action,
  q,
  status,
  branch,
  branches,
}: {
  action: string;
  q: string;
  status: string;
  branch: string | null;
  branches: { id: string; name: string }[];
}) {
  const router = useRouter();
  const form = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const go = () => {
    if (!form.current) return;
    const data = new FormData(form.current);
    const params = new URLSearchParams();
    for (const [k, v] of data)
      if (typeof v === "string" && v && !(k === "status" && v === "current")) params.set(k, v);
    const qs = params.toString();
    router.replace(qs ? `${action}?${qs}` : action, { scroll: false });
  };

  return (
    <form
      ref={form}
      action={action}
      role="search"
      className="flex flex-col gap-2 sm:flex-row"
      onSubmit={(e) => {
        e.preventDefault();
        go();
      }}
    >
      <input type="hidden" name="status" value={status} />
      <div className="relative flex-1">
        <SearchIcon
          aria-hidden
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
        />
        <label htmlFor="staff-search" className="sr-only">
          Search staff
        </label>
        <Input
          id="staff-search"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Search by name, job title, phone or staff number"
          className="pl-9"
          onChange={() => {
            clearTimeout(timer.current);
            timer.current = setTimeout(go, 300);
          }}
        />
      </div>
      {branches.length > 1 ? (
        <>
          <label htmlFor="staff-branch" className="sr-only">
            Branch
          </label>
          <NativeSelect
            id="staff-branch"
            name="branch"
            defaultValue={branch ?? ""}
            onChange={go}
            className="sm:w-48"
          >
            <option value="">All branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </NativeSelect>
        </>
      ) : null}
      <noscript>
        <button type="submit" className="rounded-md border px-3 text-sm">
          Search
        </button>
      </noscript>
    </form>
  );
}
