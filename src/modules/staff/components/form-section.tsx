/** A titled block of a long form: a short explanation beside the fields on wide screens. */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 border-t py-6 first:border-t-0 first:pt-0 md:grid-cols-[14rem_1fr] md:gap-10">
      <div>
        <h2 className="text-walnut text-sm font-semibold">{title}</h2>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">{description}</p>
        ) : null}
      </div>
      <div>{children}</div>
    </section>
  );
}
