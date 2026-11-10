import Link from "next/link";
import { Logo, CriftAttribution } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo />
        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Log in</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Get started</Link>
          </Button>
        </nav>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col justify-center px-4 py-16 sm:px-6">
        <p className="text-sm font-semibold tracking-wide text-primary uppercase">
          Workforce management for growing teams
        </p>
        <h1 className="mt-3 max-w-3xl font-heading text-4xl font-extrabold text-walnut sm:text-6xl">
          Your staff, well managed.
        </h1>
        <p className="mt-5 max-w-2xl text-lg text-muted-foreground">
          Everything your team needs to work better, together: people records, attendance, leave,
          payroll, tasks and messaging in one secure workspace.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/register">Create your workspace</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/login">I already have an account</Link>
          </Button>
        </div>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-2 px-4 py-6 sm:px-6">
          <p className="text-xs text-muted-foreground">
            © 2026 WOHKAH. All rights reserved.
          </p>
          <CriftAttribution />
        </div>
      </footer>
    </div>
  );
}
