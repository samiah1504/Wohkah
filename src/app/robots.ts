import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

/** Public marketing pages are indexable; private and account pages are not. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/w/",
        "/account",
        "/workspaces",
        "/onboarding",
        "/invite/",
        "/auth/",
        "/reset-password",
        "/login/mfa",
      ],
    },
    sitemap: `${env.appUrl}/sitemap.xml`,
  };
}
