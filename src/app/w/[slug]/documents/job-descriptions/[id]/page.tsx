import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, CheckCircle2Icon, ClockIcon } from "lucide-react";
import { TenantPage } from "@/components/shell/tenant-page";
import { Alert } from "@/components/ui/display";
import { formatDate, formatDateTime } from "@/lib/dates";
import { assignableStaff, getJobDescription } from "@/modules/documents/server/queries";
import { DocumentView } from "@/modules/documents/components/document-view";
import { AssignStaffForm, JobDescriptionForm } from "@/modules/documents/components/forms";

export const metadata: Metadata = { title: "Job description" };

export default function JobDescriptionPage(
  props: PageProps<"/w/[slug]/documents/job-descriptions/[id]">,
) {
  return (
    <TenantPage params={props.params} anyOf={["job_descriptions.manage"]}>
      {async (ctx) => {
        const [{ id }, sp] = await Promise.all([props.params, props.searchParams]);
        const jd = await getJobDescription(ctx, id);
        if (!jd) notFound();
        const slug = ctx.company.slug;
        const base = `/w/${slug}/documents/job-descriptions`;
        const editing = sp.edit === "1";
        const staff = await assignableStaff(ctx);
        return (
          <div className="grid gap-6">
            <Link
              href={base}
              className="text-muted-foreground hover:text-foreground inline-flex w-fit items-center gap-1 text-sm"
            >
              <ArrowLeftIcon className="size-4" aria-hidden /> Job descriptions
            </Link>
            {sp.saved === "1" ? (
              <Alert variant="success">
                Saved as version {jd.current?.version ?? 1}.
                {jd.staff.length
                  ? " Staff with this job description are asked to read and confirm it."
                  : ""}
              </Alert>
            ) : null}
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="font-heading text-walnut text-2xl font-extrabold">{jd.title}</h1>
                <p className="text-muted-foreground mt-1 text-sm">
                  Version {jd.current?.version ?? 0}
                  {jd.current
                    ? ` · published ${formatDate(jd.current.published_at.slice(0, 10))}`
                    : ""}
                </p>
              </div>
              {!editing ? (
                <Link
                  href={`${base}/${jd.id}?edit=1`}
                  className="text-walnut text-sm font-semibold underline"
                >
                  Edit
                </Link>
              ) : null}
            </div>

            {editing ? (
              <div className="bg-surface rounded-xl border p-5 sm:p-6">
                <JobDescriptionForm
                  slug={slug}
                  cancelHref={`${base}/${jd.id}`}
                  jd={{
                    id: jd.id,
                    title: jd.title,
                    body: jd.current?.body ?? "",
                    staffCount: jd.staff.length,
                  }}
                />
              </div>
            ) : (
              <div className="grid gap-6 xl:grid-cols-[1fr_340px]">
                <DocumentView body={jd.current?.body ?? ""} />
                <aside className="grid h-fit gap-4">
                  <section className="bg-surface rounded-xl border">
                    <h2 className="text-walnut border-b px-5 py-3 text-sm font-semibold">
                      Who has read it ({jd.staff.filter((s) => s.acknowledgedAt).length} of{" "}
                      {jd.staff.length})
                    </h2>
                    {jd.staff.length ? (
                      <ul className="divide-y">
                        {jd.staff.map((s) => (
                          <li key={s.id} className="flex items-center gap-3 px-5 py-2.5 text-sm">
                            {s.acknowledgedAt ? (
                              <CheckCircle2Icon
                                className="text-success size-4 shrink-0"
                                aria-label="Confirmed"
                              />
                            ) : (
                              <ClockIcon
                                className="text-warning size-4 shrink-0"
                                aria-label="Waiting"
                              />
                            )}
                            <Link
                              href={`/w/${slug}/staff/${s.id}`}
                              className="min-w-0 flex-1 truncate font-medium hover:underline"
                            >
                              {s.full_name}
                            </Link>
                            <span className="text-muted-foreground text-xs">
                              {s.acknowledgedAt
                                ? formatDateTime(s.acknowledgedAt, ctx.company.timezone)
                                : "Not yet"}
                            </span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-muted-foreground px-5 py-4 text-sm">
                        Choose the staff this job description is for below.
                      </p>
                    )}
                  </section>
                  <section className="bg-surface rounded-xl border p-5">
                    <h2 className="text-walnut mb-3 text-sm font-semibold">
                      Staff with this job description
                    </h2>
                    <AssignStaffForm slug={slug} id={jd.id} staff={staff} />
                  </section>
                  <section className="bg-surface rounded-xl border">
                    <h2 className="text-walnut border-b px-5 py-3 text-sm font-semibold">
                      Versions
                    </h2>
                    <ol className="divide-y">
                      {jd.versions.map((v) => (
                        <li key={v.id} className="px-5 py-2.5 text-sm">
                          <p className="font-medium">
                            Version {v.version}
                            <span className="text-muted-foreground font-normal">
                              {" "}
                              · {formatDate(v.published_at.slice(0, 10))}
                            </span>
                          </p>
                          {v.change_note ? (
                            <p className="text-muted-foreground text-xs">{v.change_note}</p>
                          ) : null}
                        </li>
                      ))}
                    </ol>
                  </section>
                </aside>
              </div>
            )}
          </div>
        );
      }}
    </TenantPage>
  );
}
