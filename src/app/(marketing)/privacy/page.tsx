import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/marketing/prose-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How WOHKAH looks after business and staff information.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <ProsePage
      eyebrow="Legal"
      title="Privacy Policy"
      notice={
        <>
          <strong>Draft.</strong> Our full privacy policy is being finalised with legal advisers
          under the Nigeria Data Protection Act 2023. Until it is published, this page summarises
          how WOHKAH handles information today.
        </>
      }
    >
      <section>
        <h2>Who is responsible for staff information</h2>
        <p className="mt-2">
          Each business that uses WOHKAH decides what information it keeps about its staff and is
          responsible for it. WOHKAH (a product of Crift Concepts) stores and processes that
          information on the business&apos;s behalf.
        </p>
      </section>
      <section>
        <h2>How we protect it</h2>
        <ul className="mt-2">
          <li>Every business&apos;s information is kept separate from every other business.</li>
          <li>People only see what their role allows. Changes are recorded in an activity log.</li>
          <li>Passwords are never stored in readable form. Two-step sign-in is available.</li>
        </ul>
      </section>
      <section>
        <h2>Location information</h2>
        <p className="mt-2">
          When attendance features are released, a staff member&apos;s location will only be checked
          at the moment they clock in or out. WOHKAH does not track staff in the background.
        </p>
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
