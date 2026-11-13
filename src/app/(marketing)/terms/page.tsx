import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/marketing/prose-page";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using WOHKAH.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <ProsePage
      eyebrow="Legal"
      title="Terms of Service"
      notice={
        <>
          <strong>Draft.</strong> Our full terms of service are being finalised with legal advisers
          and will be published before paid plans open. This page summarises the key points.
        </>
      }
    >
      <section>
        <h2>Your business account and your information</h2>
        <ul className="mt-2">
          <li>Your business owns the information it puts into WOHKAH.</li>
          <li>You&apos;re responsible for who you invite and what roles you give them.</li>
          <li>Keep your login details private and use a strong password.</li>
        </ul>
      </section>
      <section>
        <h2>Plans and payment</h2>
        <ul className="mt-2">
          <li>Every business account can use the Free plan for as long as it likes.</li>
          <li>
            Paid plans are billed monthly or yearly through Paystack. On paid plans, each extra
            active staff member above your plan&apos;s included number costs ₦1,000 a month (₦12,000
            a year). Extra approved work locations cost the same.
          </li>
          <li>
            Starter, Growth and Business can be tried free for 7 days without a card: one trial per
            business account, and one per account owner every 12 months.
          </li>
          <li>
            You&apos;ll always see what you&apos;ll pay before you pay. A plan changes only after
            the payment is confirmed.
          </li>
          <li>
            If a trial or paid plan ends, your business moves to the Free plan. If you then have
            more active staff than the plan covers, you choose who stays active and the others are
            paused. Records are never deleted because of a plan change.
          </li>
        </ul>
      </section>
      <section>
        <h2>Questions</h2>
        <p className="mt-2">
          See our <Link href="/contact">contact page</Link>.
        </p>
      </section>
    </ProsePage>
  );
}
