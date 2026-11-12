import type { Metadata, Viewport } from "next";
import { Inter, Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { env } from "@/lib/env";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL(env.appUrl),
  title: { default: "WOHKAH", template: "%s · WOHKAH" },
  description:
    "Your staff, well managed. Staff management software for small businesses: staff records, attendance, salaries, leave, tasks and staff communication.",
  applicationName: "WOHKAH",
  keywords: [
    "staff management software",
    "staff attendance software",
    "staff salary management",
    "small business staff management",
    "staff scheduling software",
    "staff management system",
  ],
  openGraph: {
    type: "website",
    siteName: "WOHKAH",
    locale: "en_NG",
    title: "WOHKAH | Staff management software for small businesses",
    description:
      "Manage your staff, track attendance, organise salaries, assign tasks and keep everyone connected from one simple platform.",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  themeColor: "#2b1d18",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${manrope.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
