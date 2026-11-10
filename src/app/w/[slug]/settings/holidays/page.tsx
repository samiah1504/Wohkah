import type { Metadata } from "next";
import Link from "next/link";
import { CalendarDaysIcon } from "lucide-react";
import { TenantPage } from "@/components/shell/tenant-page";
import { ActionButton } from "@/components/action-forms";
import { Card, CardContent, EmptyState } from "@/components/ui/display";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatDate, todayIn } from "@/lib/dates";
import { listBranches, listHolidays } from "@/modules/workspace/server/queries";
import { HolidayForm } from "@/modules/workspace/components/settings-forms";
import { deleteHoliday } from "@/modules/workspace/server/actions";

export const metadata: Metadata = { title: "Holidays" };

export default function HolidaysPage(props: PageProps<"/w/[slug]/settings/holidays">) {
  return (
    <TenantPage params={props.params} anyOf={["holidays.manage"]}>
      {async (ctx) => {
        const sp = await props.searchParams;
        const thisYear = Number(todayIn(ctx.company.timezone).slice(0, 4));
        const requested = Number(sp.year);
        const year =
          Number.isInteger(requested) && requested > 2000 && requested < 2100 ? requested : thisYear;
        const [holidays, branches] = await Promise.all([listHolidays(ctx, year), listBranches(ctx)]);
        const slug = ctx.company.slug;
        const base = `/w/${slug}/settings/holidays`;
        return (
          <div className="grid gap-4">
            <Card>
              <CardContent>
                <HolidayForm
                  slug={slug}
                  branches={branches.filter((b) => !b.archived_at).map((b) => ({ id: b.id, name: b.name }))}
                />
              </CardContent>
            </Card>
            <div className="flex items-center justify-between">
              <h2 className="font-heading text-lg font-bold">{year} holidays</h2>
              <div className="flex gap-3 text-sm font-medium">
                <Link href={`${base}?year=${year - 1}`} className="text-walnut hover:underline">
                  ← {year - 1}
                </Link>
                <Link href={`${base}?year=${year + 1}`} className="text-walnut hover:underline">
                  {year + 1} →
                </Link>
              </div>
            </div>
            {holidays.length === 0 ? (
              <EmptyState
                icon={<CalendarDaysIcon />}
                title={`No holidays for ${year}`}
                description="Add public holidays and company closure days. Attendance and leave will respect them."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Holiday</TableHead>
                    <TableHead className="hidden sm:table-cell">Applies to</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {holidays.map((h) => (
                    <TableRow key={h.id}>
                      <TableCell className="whitespace-nowrap">
                        {formatDate(h.holiday_date, { weekday: "short", day: "numeric", month: "short" })}
                      </TableCell>
                      <TableCell className="font-medium">{h.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{h.branch?.name ?? "All branches"}</TableCell>
                      <TableCell className="text-right">
                        <ActionButton
                          action={deleteHoliday}
                          hidden={{ slug, id: h.id }}
                          variant="ghost"
                          confirm="Remove?"
                        >
                          Remove
                        </ActionButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        );
      }}
    </TenantPage>
  );
}
