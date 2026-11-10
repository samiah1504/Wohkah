import Link from "next/link";
import { Logo, CriftAttribution } from "@/components/brand/logo";
import { SetupNotice } from "@/components/setup-notice";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen flex-col items-center bg-background px-4 py-10 sm:py-16">
      <Link href="/" aria-label="WOHKAH home" className="mb-8">
        <Logo withTagline />
      </Link>
      <main className="w-full max-w-md">
        <SetupNotice />
        {children}
      </main>
      <footer className="mt-auto pt-10 text-center">
        <CriftAttribution />
      </footer>
    </div>
  );
}
