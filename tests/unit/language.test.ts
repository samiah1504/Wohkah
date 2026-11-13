/**
 * Terminology check (PRODUCT_LANGUAGE_AND_POSITIONING.md §3–4).
 *
 * Scans the text customers can read in the source: string literals, template
 * text and JSX text in src/. Comments, imports, log messages, route paths and
 * identifier-like strings (no spaces, e.g. "refresh_workspace_subscription")
 * are ignored because customers never see them. Internal code and database
 * names may stay technical.
 *
 * If a deliberate use is genuinely right (quoting the customer's own words),
 * add the exact phrase to ALLOWED_PHRASES with a reason.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import { DISALLOWED_TERMS } from "@/lib/copy/terms";

const ROOT = join(__dirname, "../..");
const SRC = join(ROOT, "src");

/** Generated or server-to-server code: no customer-facing text. */
const SKIP_FILES = [/supabase\/database\.types\.ts$/, /\/app\/api\//, /\/lib\/payments\//];

/** Deliberate phrases that use the customer's own words. */
const ALLOWED_PHRASES = [/no HR department/gi, /an HR department/gi, /an HR manager/gi];

function files(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(name) ? [path] : [];
  });
}

function isLogOrImport(node: ts.Node): boolean {
  for (let p = node.parent; p; p = p.parent) {
    if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return true;
    if (ts.isCallExpression(p) && /^console\./.test(p.expression.getText())) return true;
  }
  return false;
}

/** Text a customer could read: has a space, and isn't a path or identifier. */
function readable(text: string): boolean {
  const t = text.trim();
  return /\s/.test(t) && !/^[/[]/.test(t);
}

type Finding = { file: string; line: number; text: string; term: string };

function scan(path: string): Finding[] {
  const source = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const found: Finding[] = [];
  const visit = (node: ts.Node) => {
    let text: string | null = null;
    let jsx = false;
    if (
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      text = node.text;
    } else if (ts.isJsxText(node)) {
      text = node.getText();
      jsx = true;
    }
    if (text && (jsx ? text.trim() !== "" : readable(text)) && !isLogOrImport(node)) {
      let checked = text;
      for (const phrase of ALLOWED_PHRASES) checked = checked.replace(phrase, "");
      for (const re of DISALLOWED_TERMS) {
        if (re.test(checked)) {
          found.push({
            file: relative(ROOT, path),
            line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
            text: text.trim().slice(0, 100),
            term: String(re),
          });
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return found;
}

describe("customer-facing language", () => {
  it("source text avoids the terms in PRODUCT_LANGUAGE_AND_POSITIONING.md §4", () => {
    const findings = files(SRC)
      .filter((f) => !SKIP_FILES.some((re) => re.test(f)))
      .flatMap(scan)
      .map((f) => `${f.file}:${f.line} ${f.term} "${f.text}"`);
    expect(findings).toEqual([]);
  });

  it("the check catches a disallowed term", () => {
    const re = DISALLOWED_TERMS.find((r) => r.test("Your workspace"));
    expect(re).toBeDefined();
    expect(DISALLOWED_TERMS.some((r) => r.test("Work email"))).toBe(true);
    expect(DISALLOWED_TERMS.some((r) => r.test("Email address"))).toBe(false);
  });
});
