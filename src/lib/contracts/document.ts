/**
 * The simple text format used for contracts, policies and job descriptions.
 * Written in WOHKAH's editor and rendered both on screen and in signed PDFs:
 *
 *   # Title            (large heading)
 *   ## Section         (section heading)
 *   - item             (bullet)
 *   1. item            (numbered item)
 *   **bold** text      (bold inside any line)
 *   blank line         (new paragraph)
 *
 * {{Field}} placeholders are filled from the staff record and business
 * details; anything else in {{double braces}} is a blank to complete before
 * sending (for example {{Monthly salary}}).
 */

export type Span = { text: string; bold: boolean };
export type Block =
  { type: "h1" | "h2" | "p"; spans: Span[] } | { type: "ul" | "ol"; items: Span[][] };

export function parseSpans(line: string): Span[] {
  const spans: Span[] = [];
  const parts = line.split(/(\*\*[^*]+\*\*)/g);
  for (const part of parts) {
    if (!part) continue;
    if (/^\*\*[^*]+\*\*$/.test(part)) spans.push({ text: part.slice(2, -2), bold: true });
    else spans.push({ text: part, bold: false });
  }
  return spans;
}

export function parseDocument(body: string): Block[] {
  const blocks: Block[] = [];
  let para: string[] = [];
  const flush = () => {
    if (para.length) blocks.push({ type: "p", spans: parseSpans(para.join(" ")) });
    para = [];
  };
  for (const raw of body.replace(/\r\n?/g, "\n").split("\n")) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const heading = /^(#{1,2})\s+(.*)$/.exec(line);
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    if (heading) {
      flush();
      blocks.push({ type: heading[1] === "#" ? "h1" : "h2", spans: parseSpans(heading[2]!) });
    } else if (bullet || numbered) {
      flush();
      const type = bullet ? "ul" : "ol";
      const text = (bullet ?? numbered)![1]!;
      const last = blocks[blocks.length - 1];
      if (last && last.type === type) last.items.push(parseSpans(text));
      else blocks.push({ type, items: [parseSpans(text)] });
    } else {
      para.push(line);
    }
  }
  flush();
  return blocks;
}

// ---------------------------------------------------------------------------
// Fields
// ---------------------------------------------------------------------------

/** Fields filled automatically. Labels are what people type between {{ }}. */
export const AUTO_FIELDS = [
  ["staff_name", "Staff name"],
  ["staff_first_name", "Staff first name"],
  ["staff_last_name", "Staff last name"],
  ["job_title", "Job title"],
  ["branch", "Branch"],
  ["start_date", "Start date"],
  ["employment_type", "Employment type"],
  ["staff_number", "Staff number"],
  ["staff_email", "Staff email address"],
  ["staff_phone", "Staff phone number"],
  ["staff_address", "Staff home address"],
  ["reports_to", "Reports to"],
  ["business_name", "Business name"],
  ["business_address", "Business address"],
  ["today", "Today's date"],
] as const;

export type AutoFieldKey = (typeof AUTO_FIELDS)[number][0];
export type FieldValues = Partial<Record<AutoFieldKey, string | null>>;

/** Common blanks offered in the editor (filled in by hand for each contract). */
export const SUGGESTED_BLANKS = [
  "Monthly salary",
  "Probation period",
  "Notice period",
  "Working hours",
  "Working days",
  "Annual leave days",
] as const;

const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ").replace(/[’`]/g, "'");
const BY_LABEL = new Map<string, AutoFieldKey>(AUTO_FIELDS.map(([k, label]) => [norm(label), k]));

const PLACEHOLDER = /\{\{\s*([^{}]{1,60}?)\s*\}\}/g;

/** Replace automatic fields that have a value. Unknown or empty ones stay as blanks. */
export function fillFields(text: string, values: FieldValues): string {
  return text.replace(PLACEHOLDER, (whole, label: string) => {
    const key = BY_LABEL.get(norm(label));
    const value = key ? values[key] : undefined;
    return value ? value : whole;
  });
}

/** Distinct blanks still in the text, in the order they first appear. */
export function findBlanks(text: string): string[] {
  const seen = new Map<string, string>();
  for (const m of text.matchAll(PLACEHOLDER)) {
    const label = m[1]!.trim();
    if (!seen.has(norm(label))) seen.set(norm(label), label);
  }
  return [...seen.values()];
}

/** Fill named blanks ({{Monthly salary}} → "₦150,000"). Empty answers leave the blank. */
export function fillBlanks(text: string, answers: Record<string, string>): string {
  const byLabel = new Map(Object.entries(answers).map(([k, v]) => [norm(k), v.trim()]));
  return text.replace(PLACEHOLDER, (whole, label: string) => byLabel.get(norm(label)) || whole);
}

export function isAutoField(label: string): boolean {
  return BY_LABEL.has(norm(label));
}

/** Plain text of a document (for previews and search). */
export function plainText(body: string): string {
  return parseDocument(body)
    .map((b) =>
      "spans" in b
        ? b.spans.map((s) => s.text).join("")
        : b.items.map((i) => i.map((s) => s.text).join("")).join(" "),
    )
    .join(" ");
}
