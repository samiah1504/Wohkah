import { NextResponse } from "next/server";
import { csvCell } from "@/lib/csv";
import { getTenant } from "@/lib/tenancy";
import { can } from "@/lib/permissions";
import { EMPLOYMENT_TYPES, STAFF_STATUS, staffNo } from "@/lib/copy/staff";
import { listStaffForExport, parseFilters } from "@/modules/staff/server/queries";

/**
 * CSV of the staff list, using the same filters as the page. Basic job and
 * contact fields only: private details are never exported. RLS limits the rows
 * to the staff this person may see.
 */
export async function GET(request: Request, ctx: RouteContext<"/w/[slug]/staff/export">) {
  const { slug } = await ctx.params;
  const tenant = await getTenant(slug);
  if (!tenant || !can(tenant, "staff.export")) {
    return new NextResponse("Not found", { status: 404 });
  }
  const sp = Object.fromEntries(new URL(request.url).searchParams);
  const { rows } = await listStaffForExport(tenant, parseFilters(sp));

  const header = [
    "Staff no.",
    "First name",
    "Last name",
    "Full name",
    "Job title",
    "Branch",
    "Employment type",
    "Status",
    "Start date",
    "Email address",
    "Phone number",
  ];
  const lines = [
    header,
    ...rows.map((r) => [
      staffNo(r.staff_number),
      r.first_name ?? "",
      r.last_name ?? "",
      r.full_name,
      r.job_title ?? "",
      r.branch?.name ?? "",
      EMPLOYMENT_TYPES[r.employment_type],
      STAFF_STATUS[r.status].label,
      r.start_date ?? "",
      r.email ?? "",
      r.phone ?? "",
    ]),
  ].map((cols) => cols.map(csvCell).join(","));

  const date = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + lines.join("\r\n") + "\r\n", {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="staff-${tenant.company.slug}-${date}.csv"`,
      "cache-control": "private, no-store",
    },
  });
}
