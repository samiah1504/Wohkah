import { redirect } from "next/navigation";

/** The plan page moved to Settings → Subscription. */
export default async function PlanPage(props: PageProps<"/w/[slug]/settings/plan">) {
  const { slug } = await props.params;
  redirect(`/w/${slug}/settings/subscription`);
}
