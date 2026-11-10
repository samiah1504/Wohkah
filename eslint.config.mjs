import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

/**
 * Modules allowed to use the Supabase service-role (admin) client.
 * The admin client bypasses Row Level Security, so every new entry here
 * must be justified in review and audited. See SECURITY.md.
 */
const ADMIN_CLIENT_ALLOWED = [
  "src/lib/supabase/admin.ts",
  "src/lib/rate-limit/**",
  "src/lib/audit/**",
  "src/modules/identity/server/**",
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    // Guard rails: the admin client and module internals.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ADMIN_CLIENT_ALLOWED,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/lib/supabase/admin", "**/supabase/admin"],
              message:
                "The service-role client bypasses RLS. Only allow-listed modules may import it (see eslint.config.mjs and SECURITY.md).",
            },
            {
              group: ["@/modules/*/server/*", "@/modules/*/components/*"],
              message:
                "Import another module through its public entry point (@/modules/<name>) or from within the same module only.",
            },
          ],
        },
      ],
    },
  },
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
    "coverage/**",
  ]),
]);

export default eslintConfig;
