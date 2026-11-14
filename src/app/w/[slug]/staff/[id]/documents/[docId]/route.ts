import { NextResponse } from "next/server";
import { getTenant } from "@/lib/tenancy";
import { createClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f-]{36}$/;

/**
 * Opens a staff document through a short-lived signed link. Both the row and
 * the file are read with the signed-in person's own access, so RLS and the
 * storage policies decide who can open it (owner/managers with private access,
 * or the staff member themselves).
 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/w/[slug]/staff/[id]/documents/[docId]">,
) {
  const { slug, id, docId } = await ctx.params;
  const notFound = () => new NextResponse("Not found", { status: 404 });
  if (!UUID.test(id) || !UUID.test(docId)) return notFound();
  const tenant = await getTenant(slug);
  if (!tenant) return notFound();

  const supabase = await createClient();
  const { data: doc } = await supabase
    .from("employee_documents")
    .select("storage_path, name")
    .eq("company_id", tenant.company.id)
    .eq("employee_id", id)
    .eq("id", docId)
    .maybeSingle();
  if (!doc) return notFound();

  const { data, error } = await supabase.storage
    .from("staff-documents")
    .createSignedUrl(doc.storage_path, 60, { download: downloadName(doc.name, doc.storage_path) });
  if (error || !data) return notFound();
  return NextResponse.redirect(data.signedUrl, {
    headers: { "cache-control": "private, no-store" },
  });
}

function downloadName(name: string, path: string) {
  const ext = path.match(/\.[a-z0-9]{1,5}$/i)?.[0] ?? "";
  const safe = name.replace(/[^\w .()-]+/g, "").trim() || "document";
  return safe.toLowerCase().endsWith(ext.toLowerCase()) ? safe : safe + ext;
}
