import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { parseDocument, type Span } from "./document";

export type PdfSignature = {
  party: "staff" | "business";
  signerName: string;
  markType: "typed" | "drawn";
  mark: string;
  signedAt: string;
  codeVerifiedAt: string;
  ip: string | null;
  userAgent: string | null;
  consentText: string;
};

export type PdfInput = {
  businessName: string;
  title: string;
  body: string;
  contractId: string;
  contentHash: string;
  sentAt: string;
  kind: "contract" | "policy";
  staffName: string;
  signatures: PdfSignature[];
};

const A4: [number, number] = [595.28, 841.89];
const MARGIN = 56;
const WALNUT = rgb(0x2b / 255, 0x1d / 255, 0x18 / 255);
const TEXT = rgb(0x29 / 255, 0x29 / 255, 0x29 / 255);
const MUTED = rgb(0x78 / 255, 0x66 / 255, 0x5b / 255);
const RULE = rgb(0xe7 / 255, 0xdf / 255, 0xd0 / 255);

let fonts: Promise<[Uint8Array, Uint8Array]> | null = null;
function loadFonts() {
  fonts ??= Promise.all([
    readFile(path.join(process.cwd(), "assets/fonts/Inter-Regular.ttf")),
    readFile(path.join(process.cwd(), "assets/fonts/Inter-Bold.ttf")),
  ]).then(([r, b]) => [new Uint8Array(r), new Uint8Array(b)]);
  return fonts;
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const lagos = new Intl.DateTimeFormat("en-GB", {
    dateStyle: "long",
    timeStyle: "medium",
    timeZone: "Africa/Lagos",
  }).format(d);
  return `${lagos} (Lagos time) · ${d.toISOString()}`;
}

class Writer {
  page!: PDFPage;
  y = 0;
  pages: PDFPage[] = [];
  constructor(
    private doc: PDFDocument,
    public regular: PDFFont,
    public bold: PDFFont,
  ) {
    this.newPage();
  }
  newPage() {
    this.page = this.doc.addPage(A4);
    this.pages.push(this.page);
    this.y = A4[1] - MARGIN - 18;
  }
  ensure(height: number) {
    if (this.y - height < MARGIN + 30) this.newPage();
  }
  get width() {
    return A4[0] - MARGIN * 2;
  }

  /** Wrapped rich text: spans may be bold. */
  spans(spans: Span[], opts: { size: number; indent?: number; gap?: number; color?: typeof TEXT }) {
    const { size } = opts;
    const indent = opts.indent ?? 0;
    const lineHeight = size * 1.5;
    const max = this.width - indent;
    type Word = { text: string; font: PDFFont };
    const words: Word[] = [];
    for (const s of spans) {
      const font = s.bold ? this.bold : this.regular;
      for (const part of s.text.split(/(\s+)/)) if (part) words.push({ text: part, font });
    }
    let line: Word[] = [];
    let lineWidth = 0;
    const flush = () => {
      while (line.length && /^\s+$/.test(line[line.length - 1]!.text)) line.pop();
      if (!line.length) return;
      this.ensure(lineHeight);
      let x = MARGIN + indent;
      for (const w of line) {
        this.page.drawText(w.text, { x, y: this.y, size, font: w.font, color: opts.color ?? TEXT });
        x += w.font.widthOfTextAtSize(w.text, size);
      }
      this.y -= lineHeight;
      line = [];
      lineWidth = 0;
    };
    for (const w of words) {
      if (!line.length && /^\s+$/.test(w.text)) continue;
      const width = w.font.widthOfTextAtSize(w.text, size);
      if (lineWidth + width > max && line.length) {
        flush();
        if (/^\s+$/.test(w.text)) continue;
      }
      // A single word longer than the line (for example a fingerprint) is broken up.
      if (width > max) {
        let chunk = "";
        for (const ch of w.text) {
          if (w.font.widthOfTextAtSize(chunk + ch, size) > max) {
            line.push({ text: chunk, font: w.font });
            flush();
            chunk = "";
          }
          chunk += ch;
        }
        line.push({ text: chunk, font: w.font });
        lineWidth = w.font.widthOfTextAtSize(chunk, size);
        continue;
      }
      line.push(w);
      lineWidth += width;
    }
    flush();
    this.y -= opts.gap ?? 0;
  }

  text(text: string, size: number, bold = false, color = TEXT, gap = 0) {
    this.spans([{ text, bold }], { size, gap, color });
  }

  rule(gap = 12) {
    this.ensure(gap * 2);
    this.page.drawLine({
      start: { x: MARGIN, y: this.y + 6 },
      end: { x: A4[0] - MARGIN, y: this.y + 6 },
      thickness: 0.75,
      color: RULE,
    });
    this.y -= gap;
  }
}

export async function renderSignedPdf(input: PdfInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const [r, b] = await loadFonts();
  const regular = await doc.embedFont(r);
  const bold = await doc.embedFont(b);
  doc.setTitle(input.title);
  doc.setAuthor(input.businessName);
  doc.setCreator("WOHKAH");
  doc.setProducer("WOHKAH");
  doc.setCreationDate(new Date());

  const w = new Writer(doc, regular, bold);

  // Document body.
  for (const block of parseDocument(input.body)) {
    if (block.type === "h1") {
      w.ensure(40);
      w.spans(
        block.spans.map((x) => ({ ...x, bold: true })),
        { size: 18, gap: 8, color: WALNUT },
      );
    } else if (block.type === "h2") {
      w.ensure(36);
      w.y -= 6;
      w.spans(
        block.spans.map((x) => ({ ...x, bold: true })),
        { size: 12, gap: 4, color: WALNUT },
      );
    } else if (block.type === "p") {
      w.spans(block.spans, { size: 10.5, gap: 8 });
    } else if ("items" in block) {
      block.items.forEach((item, i) => {
        const marker = block.type === "ul" ? "•" : `${i + 1}.`;
        w.ensure(16);
        w.page.drawText(marker, { x: MARGIN + 4, y: w.y, size: 10.5, font: regular, color: TEXT });
        w.spans(item, { size: 10.5, indent: 20, gap: 2 });
      });
      w.y -= 6;
    }
  }

  // Signatures.
  w.y -= 10;
  w.ensure(60);
  w.rule(18);
  w.text(input.kind === "contract" ? "Signatures" : "Acknowledgement", 12.5, true, WALNUT, 8);
  const order: ("business" | "staff")[] =
    input.kind === "contract" ? ["business", "staff"] : ["staff"];
  for (const party of order) {
    const s = input.signatures.find((x) => x.party === party);
    w.ensure(110);
    w.text(
      party === "business" ? `For ${input.businessName}` : "Staff member",
      9.5,
      false,
      MUTED,
      4,
    );
    if (s) {
      if (s.markType === "drawn" && s.mark.startsWith("data:image/png;base64,")) {
        const png = await doc.embedPng(Buffer.from(s.mark.split(",")[1]!, "base64"));
        const scale = Math.min(180 / png.width, 50 / png.height);
        w.ensure(60);
        w.page.drawImage(png, {
          x: MARGIN,
          y: w.y - png.height * scale + 10,
          width: png.width * scale,
          height: png.height * scale,
        });
        w.y -= png.height * scale + 6;
      } else {
        w.text(s.mark, 20, true, WALNUT, 2);
      }
      w.text(`${s.signerName} · signed ${formatWhen(s.signedAt)}`, 9, false, MUTED, 12);
    }
  }

  // Signing certificate.
  w.newPage();
  w.text("Signing certificate", 18, true, WALNUT, 6);
  w.text(
    "This page records how this document was signed in WOHKAH. The fingerprint identifies the exact text that was sent for signing: any change to the text would give a different fingerprint.",
    9.5,
    false,
    MUTED,
    12,
  );
  const rows: [string, string][] = [
    ["Document", input.title],
    ["Business", input.businessName],
    ["Staff member", input.staffName],
    ["Document ID", input.contractId],
    ["Sent for signing", formatWhen(input.sentAt)],
    ["Document fingerprint (SHA-256)", input.contentHash],
  ];
  for (const [label, value] of rows) {
    w.text(label, 9, false, MUTED);
    w.text(value, 10.5, false, TEXT, 6);
  }
  for (const s of input.signatures) {
    w.ensure(170);
    w.rule(16);
    w.text(
      s.party === "business" ? `Signed for ${input.businessName}` : "Signed by the staff member",
      12,
      true,
      WALNUT,
      6,
    );
    const details: [string, string][] = [
      ["Name", s.signerName],
      ["Signature", s.markType === "drawn" ? "Drawn by hand on screen" : `Typed: ${s.mark}`],
      ["Signed", formatWhen(s.signedAt)],
      ["Email code confirmed", formatWhen(s.codeVerifiedAt)],
      ["Network address", s.ip ?? "Not available"],
      ["Device", s.userAgent ?? "Not available"],
      ["Agreed to", s.consentText],
    ];
    for (const [label, value] of details) {
      w.text(label, 9, false, MUTED);
      w.text(value, 10, false, TEXT, 5);
    }
  }

  // Footer on every page.
  const total = w.pages.length;
  w.pages.forEach((page, i) => {
    page.drawText(input.businessName, {
      x: MARGIN,
      y: A4[1] - 34,
      size: 8,
      font: regular,
      color: MUTED,
    });
    page.drawText(`Page ${i + 1} of ${total} · Fingerprint ${input.contentHash.slice(0, 16)}…`, {
      x: MARGIN,
      y: 30,
      size: 7.5,
      font: regular,
      color: MUTED,
    });
  });

  return doc.save();
}
