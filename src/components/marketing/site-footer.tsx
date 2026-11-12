import Link from "next/link";
import { Logo } from "@/components/brand/logo";

const COLUMNS = [
  {
    title: "Product",
    links: [
      { label: "Features", href: "/#features" },
      { label: "How It Works", href: "/#how-it-works" },
      { label: "Pricing", href: "/#pricing" },
      { label: "FAQs", href: "/#faqs" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
  {
    title: "Account",
    links: [
      { label: "Log In", href: "/login" },
      { label: "Create an Account", href: "/register" },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="bg-walnut text-sand">
      <div className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.4fr_2fr]">
        <div className="max-w-sm">
          <Logo tone="light" />
          <p className="text-sidebar-muted mt-4 text-sm leading-relaxed">
            Staff management for small businesses: staff records, attendance, salaries, leave, tasks
            and staff communication in one simple place.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <h2 className="text-sm font-bold text-white">{col.title}</h2>
              <ul className="mt-3 grid gap-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-sidebar-muted text-sm hover:text-white">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="text-sidebar-muted mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-5 text-xs sm:px-6">
          <p>
            <span className="text-sand font-semibold">WOHKAH</span> — Your staff, well managed.
          </p>
          <p>A product of Crift Concepts · © 2026</p>
        </div>
      </div>
    </footer>
  );
}
