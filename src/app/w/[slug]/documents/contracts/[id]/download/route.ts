import { NextResponse } from "next/server";
import { getTenant } from "@/lib/tenancy";
import { createClient } from "@/lib/supabase/server";

/**
 * The signed copy (PDF with its signing certificate), through a 60-second
 * link created with the viewer's own session: RLS and the storage policy
 * decide who may open it (people who manage or sign contracts, and the staff
 * member it belongs to).
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/w/[slug]/documents/contracts/[id]/download">,
) {
  const { slug, id } = await ctx.params;
  const notFound = () => new NextResponse("Not found", { status: 404 });
  if (!/^[0-9a-f-]{36}$/.test(id)) return notFound();
  const tenant = await getTenant(slug);
  if (!tenant) return notFound();
  const supabase = await createClient();
  const { data: c } = await supabase
    .from("contracts")
    .select("title, final_pdf_path")
    .eq("company_id", tenant.company.id)
    .eq("id", id)
    .maybeSingle();
  if (!c?.final_pdf_path) return notFound();
  const name = `${c.title.replace(/[^\w .()-]+/g, "").trim() || "document"} (signed).pdf`;
  const { data, error } = await supabase.storage
    .from("contracts")
    .createSignedUrl(c.final_pdf_path, 60, { download: name });
  if (error || !data) return notFound();
  return NextResponse.redirect(data.signedUrl, {
    headers: { "cache-control": "private, no-store" },
  });
}
