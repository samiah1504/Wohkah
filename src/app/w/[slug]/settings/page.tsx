import { Suspense } from "react";
import { redirect } from "next/navigation";

export default function SettingsIndex(props: PageProps<"/w/[slug]/settings">) {
  return (
    <Suspense fallback={null}>
      <Go params={props.params} />
    </Suspense>
  );
}

async function Go({ params }: { params: Promise<{ slug: string }> }): Promise<null> {
  const { slug } = await params;
  redirect(`/w/${slug}/settings/company`);
}
