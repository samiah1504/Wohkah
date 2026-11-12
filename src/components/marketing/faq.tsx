import Link from "next/link";
import { PLANS, naira } from "@/lib/plans";

const free = PLANS[0]!;

/**
 * Answers must match what WOHKAH does today and approved product decisions.
 * Update them when a feature ships (see src/lib/copy/features.ts).
 */
export const FAQS: { q: string; text: string }[] = [
  {
    q: "What is WOHKAH?",
    text: "WOHKAH is staff management software for small businesses. It brings your staff records, attendance, salaries, leave, tasks and staff communication together in one simple place, instead of WhatsApp messages, notebooks and spreadsheets.",
  },
  {
    q: "Who can use WOHKAH?",
    text: "Any business that has people to manage, especially businesses with about 5 to 50 staff: shops, restaurants, schools, salons, furniture makers, e-commerce and logistics businesses, agencies and service businesses. It also works for larger teams of 100 staff and more.",
  },
  {
    q: "Do I need an HR manager to use WOHKAH?",
    text: "No. WOHKAH is built for business owners and managers who look after their staff themselves. Everything uses everyday language, and you can set it up without training.",
  },
  {
    q: "Can I manage my staff salaries?",
    text: "Salary management is coming soon. You'll be able to set each staff member's salary, allowances and deductions, review and approve the monthly salaries, record payments, and share salary slips with your staff. Salaries are never marked as paid until you confirm payment.",
  },
  {
    q: "Can staff clock in using their phones?",
    text: "This is coming soon. Staff will clock in and out from their phone's browser. WOHKAH checks they are at one of your approved work locations, and only checks their location when they clock in or out. It never tracks them in the background.",
  },
  {
    q: "Can I manage multiple branches?",
    text: "Yes, available now. You can add your branches and departments today. The Free plan includes one branch, and paid plans include more.",
  },
  {
    q: "Can staff access their own portal?",
    text: "Yes. When you invite a staff member, they get their own login. Today they can sign in to your workspace. Their portal will grow to include attendance, leave requests, salary slips and tasks as those features are released.",
  },
  {
    q: "Can I use WOHKAH on my phone?",
    text: "Yes. WOHKAH works in the browser on any modern phone, tablet or computer. There's nothing to download.",
  },
  {
    q: "Can I upgrade my subscription?",
    text: "Yes. Every workspace starts on the Free plan. Online payment for paid plans is being set up; until it's ready, contact us and we'll upgrade you. You'll always see the price before you're charged.",
  },
  {
    q: "How much does additional staff cost?",
    text: `${naira(free.extraStaffMinor)} per additional active staff member per month, on every plan. Only active staff count. People who haven't accepted their invitation, have left, or have been archived are not charged for.`,
  },
  {
    q: "Can I use my own company domain?",
    text: "Not yet. Using your own address (for example staff.yourcompany.com) is planned for paid plans. Your domain stays yours: WOHKAH will only help you connect it.",
  },
  {
    q: "Can I cancel my subscription?",
    text: "Yes. If you cancel a paid plan, your workspace returns to the Free plan's limits at the end of the period you've paid for. Your records are kept and not deleted.",
  },
];

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
          <p className="text-muted-foreground pb-5 leading-relaxed">{f.text}</p>
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
