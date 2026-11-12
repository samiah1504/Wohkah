import type { Metadata } from "next";
import Link from "next/link";
import { ProsePage } from "@/components/marketing/prose-page";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with the WOHKAH team.",
  alternates: { canonical: "/contact" },
};

export default function ContactPage() {
  const email = env.contactEmail;
  return (
    <ProsePage
      eyebrow="Contact"
      title="Talk to the WOHKAH team"
      intro="Questions about WOHKAH, upgrading your plan, or how it could work for your business? We'd like to hear from you."
    >
      {email ? (
        <section>
          <h2>Email us</h2>
          <p className="mt-2">
            <a href={`mailto:${email}`}>{email}</a>
          </p>
          <p className="text-muted-foreground mt-2 text-sm">
            Tell us your business name and how many staff you have, and we&apos;ll reply as soon as
            we can.
          </p>
        </section>
      ) : (
        <section>
          <h2>Our support inbox is being set up</h2>
          <p className="mt-2">
            A public contact address will be published here shortly. If you already use WOHKAH, the
            person who invited you can help with access questions.
          </p>
        </section>
      )}
      <section>
        <h2>Already using WOHKAH?</h2>
        <p className="mt-2">
          <Link href="/login">Log in to your workspace</Link>. If you&apos;ve forgotten your
          password, use <Link href="/forgot-password">reset password</Link>.
        </p>
      </section>
    </ProsePage>
  );
}
