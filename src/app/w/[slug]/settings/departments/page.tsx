import { redirect } from "next/navigation";

/**
 * Departments were removed from WOHKAH (product owner, 2026-11-14). Existing
 * department records are kept in the database; old links go to Settings.
 */
export default async function DepartmentsPage(props: PageProps<"/w/[slug]/settings/departments">) {
  const { slug } = await props.params;
  redirect(`/w/${slug}/settings/company`);
}
