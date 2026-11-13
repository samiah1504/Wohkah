import { CheckIcon, MinusIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  COMPARISON,
  FEATURE_INFO,
  PLANS,
  entitlement,
  formatLimit,
  naira,
  type ComparisonRow,
  type Plan,
  type PlanCode,
} from "@/lib/plans/catalog";

/**
 * Full plan comparison, generated from the central catalogue (the same data
 * the database enforces). Used on the public pricing page and on the
 * workspace subscription page. Features that aren't built yet are labelled
 * "Coming soon" so nothing is advertised as working before it does.
 */
export function ComparisonTable({ current }: { current?: PlanCode }) {
  return (
    <div className="bg-surface overflow-x-auto rounded-2xl border">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <caption className="sr-only">Compare what each WOHKAH plan includes</caption>
        <thead>
          <tr className="border-b">
            <th
              scope="col"
              className="bg-surface sticky left-0 z-10 w-[38%] p-3 text-left font-semibold"
            >
              Feature
            </th>
            {PLANS.map((p) => (
              <th
                key={p.code}
                scope="col"
                className={cn(
                  "font-heading text-walnut p-3 text-center",
                  p.code === current && "bg-primary/10",
                )}
              >
                <span className="block font-extrabold">{p.name}</span>
                <span className="text-muted-foreground block text-xs font-medium">
                  {p.monthlyMinor === 0 ? "₦0" : naira(p.monthlyMinor)}/month
                </span>
                {p.code === current ? (
                  <span className="text-walnut bg-primary mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold">
                    Your plan
                  </span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        {COMPARISON.map((section) => (
          <tbody key={section.title}>
            <tr>
              <th
                scope="colgroup"
                colSpan={PLANS.length + 1}
                className="bg-subtle/60 text-walnut sticky left-0 p-3 text-left text-xs font-bold tracking-wide uppercase"
              >
                {section.title}
              </th>
            </tr>
            {section.rows.map((row, i) => (
              <ComparisonTableRow key={`${section.title}-${i}`} row={row} current={current} />
            ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

function ComparisonTableRow({ row, current }: { row: ComparisonRow; current?: PlanCode }) {
  const { label, comingSoon, cell } = describe(row);
  return (
    <tr className="border-b last:border-0">
      <th scope="row" className="bg-surface sticky left-0 z-10 p-3 text-left font-medium">
        {label}
        {comingSoon ? (
          <span className="bg-subtle text-walnut ml-2 rounded-full px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap">
            Coming soon
          </span>
        ) : null}
      </th>
      {PLANS.map((p) => (
        <td key={p.code} className={cn("p-3 text-center", p.code === current && "bg-primary/5")}>
          {cell(p)}
        </td>
      ))}
    </tr>
  );
}

const Included = () => <CheckIcon className="text-success inline size-4" aria-label="Included" />;
const NotIncluded = () => (
  <MinusIcon className="text-muted-foreground inline size-4" aria-label="Not included" />
);

function describe(row: ComparisonRow): {
  label: string;
  comingSoon: boolean;
  cell: (p: Plan) => React.ReactNode;
} {
  switch (row.type) {
    case "staff":
      return {
        label: "Active staff included",
        comingSoon: false,
        cell: (p) => <strong>{p.includedStaff}</strong>,
      };
    case "extraStaff":
      return {
        label: "Extra active staff",
        comingSoon: false,
        cell: (p) =>
          p.extraStaff.allowed ? (
            <span className="text-xs">
              {naira(p.extraStaff.monthlyMinor)}/month each
              <span className="text-muted-foreground block">
                {naira(p.extraStaff.annualMinor)}/year
              </span>
            </span>
          ) : (
            <span className="text-muted-foreground text-xs">Upgrade needed</span>
          ),
      };
    case "extraLocations":
      return {
        label: "Extra work locations",
        comingSoon: false,
        cell: (p) => (
          <span className="text-xs">
            {naira(p.extraWorkLocation.monthlyMinor)}/month each
            <span className="text-muted-foreground block">
              {naira(p.extraWorkLocation.annualMinor)}/year
            </span>
          </span>
        ),
      };
    case "support":
      // Only approved support levels are shown; undefined values stay empty.
      return { label: "Support", comingSoon: false, cell: (p) => p.supportLevel ?? "" };
    case "reportHistory":
      return {
        label: "Report history",
        comingSoon: true,
        cell: (p) => (p.reportHistoryMonths ? `${p.reportHistoryMonths} months` : ""),
      };
    case "feature": {
      const info = FEATURE_INFO[row.key];
      return {
        label: info.label,
        comingSoon: !info.available,
        cell: (p) => {
          const e = entitlement(p.code, row.key);
          if (e.enabled && e.limit === null && !isLimit(row.key)) return <Included />;
          if (!e.enabled && !isLimit(row.key)) return <NotIncluded />;
          return <strong>{formatLimit(row.key, e)}</strong>;
        },
      };
    }
  }
}

function isLimit(key: string) {
  return ["admins", "branches", "work_locations", "storage_mb"].includes(key);
}
