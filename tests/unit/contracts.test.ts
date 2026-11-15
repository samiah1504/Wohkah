import { describe, expect, it, vi } from "vitest";
import { PDFDocument } from "pdf-lib";
import { fillBlanks, fillFields, findBlanks, parseDocument } from "@/lib/contracts/document";
import { STARTER_TEMPLATES } from "@/lib/contracts/starters";

vi.mock("server-only", () => ({}));

describe("document format", () => {
  it("reads headings, paragraphs, lists and bold text", () => {
    const blocks = parseDocument(
      "# Title\n\n## Section\nLine one\nline two\n\n- a\n- **b**\n\n1. x\n2. y",
    );
    expect(blocks.map((b) => b.type)).toEqual(["h1", "h2", "p", "ul", "ol"]);
    expect(blocks[2]).toMatchObject({ spans: [{ text: "Line one line two", bold: false }] });
    expect(blocks[3]).toMatchObject({ items: [[{ text: "a" }], [{ text: "b", bold: true }]] });
  });

  it("fills known fields and leaves blanks to complete", () => {
    const text = "{{Staff name}} earns {{Monthly salary}} at {{ business NAME }}. {{Branch}}";
    const filled = fillFields(text, {
      staff_name: "Ada Obi",
      business_name: "Mama Put Ltd",
      branch: null,
    });
    expect(filled).toBe("Ada Obi earns {{Monthly salary}} at Mama Put Ltd. {{Branch}}");
    expect(findBlanks(filled)).toEqual(["Monthly salary", "Branch"]);
    expect(fillBlanks(filled, { "monthly salary": "₦150,000", Branch: "" })).toBe(
      "Ada Obi earns ₦150,000 at Mama Put Ltd. {{Branch}}",
    );
  });

  it("starter templates use only fields and blanks people can fill", () => {
    for (const t of STARTER_TEMPLATES) {
      expect(parseDocument(t.body)[0]?.type).toBe("h1");
      for (const blank of findBlanks(t.body)) expect(blank.length).toBeLessThan(40);
    }
  });
});

describe("signed PDF", () => {
  it("renders the document, signatures and a signing certificate with Nigerian names and ₦", async () => {
    const { renderSignedPdf } = await import("@/lib/contracts/pdf");
    const bytes = await renderSignedPdf({
      businessName: "Ọlá Foods Ltd",
      staffName: "Adébáyọ̀ Ṣọlá",
      title: "Contract of Employment",
      body: STARTER_TEMPLATES[0]!.body.replace(/\{\{[^}]+\}\}/g, "₦150,000"),
      contractId: "6f1c1b0e-3c39-4d0e-9a52-6a1f4c7b8e21",
      contentHash: "a".repeat(64),
      sentAt: "2026-11-15T09:00:00Z",
      kind: "contract",
      signatures: [
        {
          party: "business",
          signerName: "Ọlá Owner",
          markType: "typed",
          mark: "Ọlá Owner",
          signedAt: "2026-11-15T09:05:00Z",
          codeVerifiedAt: "2026-11-15T09:04:50Z",
          ip: "102.89.1.2",
          userAgent: "Mozilla/5.0",
          consentText: "I agree.",
        },
        {
          party: "staff",
          signerName: "Adébáyọ̀ Ṣọlá",
          markType: "typed",
          mark: "Adébáyọ̀ Ṣọlá",
          signedAt: "2026-11-15T10:00:00Z",
          codeVerifiedAt: "2026-11-15T09:59:40Z",
          ip: null,
          userAgent: null,
          consentText: "I agree.",
        },
      ],
    });
    const pdf = await PDFDocument.load(bytes);
    expect(pdf.getPageCount()).toBeGreaterThanOrEqual(3);
    expect(pdf.getTitle()).toBe("Contract of Employment");
    if (process.env.SAVE_PDF) (await import("node:fs")).writeFileSync(process.env.SAVE_PDF, bytes);
  });
});
