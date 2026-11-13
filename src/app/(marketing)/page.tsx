import type { Metadata } from "next";
import { Pricing } from "@/components/marketing/pricing";
import { Faq, FAQS, faqAnswer } from "@/components/marketing/faq";
import { SectionHeading } from "@/components/marketing/sections";
import {
  BusinessStrip,
  FeatureBands,
  FinalCta,
  Hero,
  HowItWorks,
  OwnerQuestions,
  Story,
  WhoItsFor,
} from "@/components/marketing/home/sections";
import { PLANS } from "@/lib/plans/catalog";
import { ComparisonTable } from "@/components/plans/comparison-table";

export const metadata: Metadata = {
  title: { absolute: "WOHKAH | Staff management software for small businesses" },
  description:
    "Know who came to work, what you're paying in salaries, who you've paid and who's on leave. Staff management for small and growing businesses with 1–50 staff.",
  alternates: { canonical: "/" },
};

/** Structured data for search engines: the product, its plans and the FAQ. */
function JsonLd() {
  const data = [
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "WOHKAH",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      description:
        "Staff management software for small businesses: staff records, attendance, salaries, leave, tasks and staff communication.",
      publisher: { "@type": "Organization", name: "Crift Concepts" },
      offers: PLANS.map((p) => ({
        "@type": "Offer",
        name: p.name,
        price: (p.monthlyMinor / 100).toFixed(0),
        priceCurrency: "NGN",
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQS.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: faqAnswer(f) },
      })),
    },
  ];
  return (
    <script
      type="application/ld+json"
      // Static, server-generated content (no user input).
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}

export default function HomePage() {
  return (
    <>
      <JsonLd />
      {/* Without JavaScript, show everything that would otherwise animate in. */}
      <noscript>
        <style>{`[data-reveal]{opacity:1!important;transform:none!important}.wk-strike{transform:scaleX(1)!important}`}</style>
      </noscript>
      <Hero />
      <BusinessStrip />
      <Story />
      <OwnerQuestions />
      <FeatureBands />
      <WhoItsFor />
      <HowItWorks />
      <section id="pricing" className="scroll-mt-20 py-20 sm:py-28">
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
          <SectionHeading
            eyebrow="Pricing"
            title="Simple pricing that grows with your team"
            description="Start free, or try a paid plan free for 7 days. Bigger plans include more staff, more locations and more control."
          />
          <div className="mt-10">
            <Pricing />
          </div>
          <div className="mt-14">
            <h3 className="font-heading text-walnut mb-4 text-center text-xl font-extrabold">
              Compare plans in detail
            </h3>
            <ComparisonTable />
          </div>
        </div>
      </section>
      <section id="faqs" className="bg-sand/50 scroll-mt-20 py-16 sm:py-24">
        <div className="mx-auto w-full max-w-3xl px-4 sm:px-6">
          <SectionHeading eyebrow="FAQs" title="Frequently asked questions" />
          <div className="mt-10">
            <Faq />
          </div>
        </div>
      </section>
      <FinalCta />
    </>
  );
}
