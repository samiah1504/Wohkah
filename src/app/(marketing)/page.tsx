import type { Metadata } from "next";
import { ProductPreview } from "@/components/marketing/product-preview";
import { Pricing } from "@/components/marketing/pricing";
import { Faq, FAQS } from "@/components/marketing/faq";
import {
  Benefits,
  Features,
  FinalCta,
  Hero,
  HowItWorks,
  ProblemSolution,
  SectionHeading,
  WhoItsFor,
} from "@/components/marketing/sections";
import { PLANS } from "@/lib/plans/catalog";
import { ComparisonTable } from "@/components/plans/comparison-table";

export const metadata: Metadata = {
  title: { absolute: "WOHKAH | Staff management software for small businesses" },
  description:
    "Manage your staff, track attendance, organise salaries, assign tasks and keep everyone connected from one simple platform. Built for small businesses with no HR department.",
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
        acceptedAnswer: { "@type": "Answer", text: f.text },
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
      <Hero />
      <section aria-label="Product preview" className="px-4 pt-6 pb-20 sm:px-6 sm:pb-28">
        <div className="mx-auto max-w-6xl">
          <ProductPreview />
        </div>
      </section>
      <ProblemSolution />
      <Features />
      <WhoItsFor />
      <HowItWorks />
      <Benefits />
      <section id="pricing" className="scroll-mt-20 py-16 sm:py-24">
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
