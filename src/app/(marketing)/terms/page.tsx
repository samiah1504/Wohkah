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
        <h2>Your workspace and your information</h2>
        <ul className="mt-2">
          <li>Your business owns the information it puts into WOHKAH.</li>
          <li>You&apos;re responsible for who you invite and what roles you give them.</li>
          <li>Keep your login details private and use a strong password.</li>
        </ul>
      </section>
      <section>
        <h2>Plans and payment</h2>
        <ul className="mt-2">
          <li>Every workspace can use the Free plan for as long as it likes.</li>
          <li>
            Paid plans are billed monthly or yearly. Each extra active staff member above your
            plan&apos;s included number costs ₦1,000 a month.
          </li>
          <li>You&apos;ll always see what you&apos;ll pay before you&apos;re charged.</li>
          <li>
            If a paid plan ends, your workspace moves to the Free plan&apos;s limits. Your records
            are not deleted.
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
