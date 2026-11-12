import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/marketing/prose-page";

export const metadata: Metadata = {
  title: "About",
  description: "Why WOHKAH exists, and the company behind it.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <ProsePage
      eyebrow="About WOHKAH"
      title="Staff management made for real small businesses"
      intro="WOHKAH (pronounced “worker”) helps business owners manage their staff, organise daily work, keep track of attendance, manage salaries and communicate with their team, from one simple platform."
    >
      <section>
        <h2>Why we built it</h2>
        <p className="mt-2">
          Most small businesses don&apos;t have an HR department. The owner or a trusted manager
          keeps track of attendance in a register, works out salaries in a notebook or spreadsheet,
          and gives instructions over WhatsApp. It works, until it doesn&apos;t. WOHKAH brings all
          of that together in one place, in plain language, without needing training.
        </p>
      </section>
      <section>
        <h2>What we believe</h2>
        <ul className="mt-2">
          <li>Software for small businesses should be simple, not simplistic.</li>
          <li>Staff information is private. We protect it as if it were our own.</li>
          <li>Salaries must be calculated accurately on every plan, including the free one.</li>
          <li>We&apos;ll tell you plainly what WOHKAH can and can&apos;t do yet.</li>
        </ul>
      </section>
      <section>
        <h2>The company behind WOHKAH</h2>
        <p className="mt-2">
          WOHKAH is a product of <strong>Crift Concepts</strong>. We&apos;re starting in Nigeria and
          building for businesses across Africa and beyond.
        </p>
        <p className="mt-2">
          <Link href="/contact">Get in touch</Link> or{" "}
          <Link href="/register">create your free workspace</Link>.
        </p>
      </section>
    </ProsePage>
  );
}
