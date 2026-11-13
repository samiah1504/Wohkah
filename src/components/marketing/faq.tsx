import Link from "next/link";
import { PLANS, naira } from "@/lib/plans/catalog";
import { PRIMARY_FEATURES } from "@/lib/copy/features";

const starter = PLANS[1]!;

/**
 * Answers are written as WOHKAH works when the feature is live, so nothing has
 * to be rewritten at launch. An answer about an unbuilt feature names it in
 * `feature`; until its switch in src/lib/copy/features.ts is on, a "coming
 * soon" note is added automatically.
 */
export const FAQS: { q: string; text: string; feature?: string }[] = [
  {
    q: "What is WOHKAH?",
    text: "WOHKAH helps business owners manage their staff without the stress. It brings attendance, salaries, leave, staff records, tasks and team communication together in one place, instead of WhatsApp messages, notebooks and spreadsheets.",
  },
  {
    q: "Who can use WOHKAH?",
    text: "Businesses with 1 to 50 staff, from a shop with one sales assistant to a business with several branches: supermarkets, restaurants, schools, salons, pharmacies, furniture makers, logistics businesses, agencies and more. It keeps working as your team grows.",
  },
  {
    q: "Do I need any special training to use WOHKAH?",
    text: "No. WOHKAH uses everyday language and is built for business owners and managers, so you can set it up yourself in a few minutes. If someone already looks after your staff, they can use it too.",
  },
  {
    q: "Can I manage my staff salaries?",
    text: "Yes. Set each staff member's salary, allowances and deductions, see your total salary bill, review and approve the month's salaries, record who you've paid and share salary slips with your staff. Salaries are never marked as paid until you confirm payment. WOHKAH doesn't send money; you pay your staff the way you already do.",
    feature: "salaries",
  },
  {
    q: "Can staff clock in using their phones?",
    text: "Yes. Staff clock in and out from their phone's browser. WOHKAH checks they are at one of your approved work locations, and only checks their location when they clock in or out. It never tracks them in the background.",
    feature: "attendance",
  },
  {
    q: "Can I manage multiple branches?",
    text: "Yes. Add your branches and approved work locations, and see what's happening at each one. Free includes 1 branch, Starter up to 2, Growth up to 5 and Business up to 10. Branches and work locations are separate: a branch can have several approved work locations, and every plan can add extra work locations.",
  },
  {
    q: "Can staff access their own portal?",
    text: "Yes. When you invite a staff member, they get their own login to the staff portal, where they clock in, request leave, see their salary slips and follow their tasks.",
    feature: "staff",
  },
  {
    q: "Can I use WOHKAH on my phone?",
    text: "Yes. WOHKAH works in the browser on any modern phone, tablet or computer. There's nothing to download.",
  },
  {
    q: "Is there a free trial?",
    text: "Yes. You can try Starter, Growth or Business free for 7 days, with no card required. There's one free trial per business. When the trial ends, your business moves to the Free plan unless you subscribe, and none of your records are deleted.",
  },
  {
    q: "Can I upgrade my subscription?",
    text: "Yes. You can upgrade from Settings → Subscription at any time, and pay monthly or yearly. You'll always see the price before you pay, and your plan changes only after the payment is confirmed.",
  },
  {
    q: "How much does additional staff cost?",
    text: `On Starter, Growth and Business, each additional active staff member costs ${naira(starter.extraStaff.monthlyMinor)} a month or ${naira(starter.extraStaff.annualMinor)} a year. Only active staff count; people who have left or been archived are not charged for. The Free plan covers up to 3 active staff and doesn't offer extra staff, so upgrade to manage more.`,
  },
  {
    q: "Can I cancel my subscription?",
    text: "Yes. If you move to a smaller plan, the change takes effect at the end of the period you've paid for. If you then have more active staff than the plan covers, you choose who stays active; the others are paused, not deleted, and can be reactivated later.",
  },
];

const isLive = (key?: string) =>
  !key || (PRIMARY_FEATURES.find((f) => f.key === key)?.available ?? true);

/** The answer as customers read it, with the automatic note while a feature is unbuilt. */
export function faqAnswer(f: (typeof FAQS)[number]): string {
  return isLive(f.feature) ? f.text : `${f.text} This feature is coming soon.`;
}

export function Faq() {
  return (
    <div className="bg-surface divide-y rounded-2xl border">
      {FAQS.map((f) => (
        <details key={f.q} className="group px-5 py-1 sm:px-6">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-4 font-semibold [&::-webkit-details-marker]:hidden">
            {f.q}
            <span
              aria-hidden
              className="text-walnut bg-sand flex size-7 shrink-0 items-center justify-center rounded-full text-lg transition-transform group-open:rotate-45"
            >
              +
            </span>
          </summary>
          <p className="text-muted-foreground pb-5 leading-relaxed">
            {f.text}
            {isLive(f.feature) ? null : (
              <span className="bg-subtle text-walnut ml-2 rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap">
                Coming soon
              </span>
            )}
          </p>
        </details>
      ))}
      <div className="px-5 py-4 text-sm sm:px-6">
        Another question?{" "}
        <Link href="/contact" className="text-walnut font-semibold underline">
          Contact us
        </Link>
        .
      </div>
    </div>
  );
}
