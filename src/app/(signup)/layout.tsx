import Link from "next/link";
import { CriftAttribution, Logo } from "@/components/brand/logo";
import { SetupNotice } from "@/components/setup-notice";

/** Plain, focused layout for sign-up: logo, form, nothing else. */
export default function SignupLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="bg-background flex min-h-screen flex-col">
      <header className="mx-auto w-full max-w-lg px-5 pt-6 sm:pt-10">
        <Link href="/" aria-label="WOHKAH home" className="inline-block">
          <Logo />
        </Link>
      </header>
      <main className="mx-auto w-full max-w-lg px-5 pt-8 pb-12 sm:pt-12">
        <SetupNotice />
        {children}
      </main>
      <footer className="mt-auto pb-8 text-center">
        <CriftAttribution />
      </footer>
    </div>
  );
}
