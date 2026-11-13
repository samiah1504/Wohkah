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
  // Applies VERIFIED provider payments (service role only; see SECURITY.md).
  "src/lib/payments/**",
];

const ADMIN_IMPORT = {
  group: ["@/lib/supabase/admin", "**/supabase/admin"],
  message:
    "The service-role client bypasses RLS. Only allow-listed modules may import it (see eslint.config.mjs and SECURITY.md).",
};

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
    // Guard rail: the service-role client bypasses RLS.
    files: ["src/**/*.{ts,tsx}"],
    ignores: [...ADMIN_CLIENT_ALLOWED, "src/modules/**"],
    rules: {
      "no-restricted-imports": ["error", { patterns: [ADMIN_IMPORT] }],
    },
  },
  {
    // Inside a module: same-module files use relative imports; other modules
    // are reached only through their public entry point (@/modules/<name>).
    // Route files in src/app are the composition layer and may import module
    // actions, queries and components directly.
    files: ["src/modules/**/*.{ts,tsx}"],
    ignores: ADMIN_CLIENT_ALLOWED,
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            ADMIN_IMPORT,
            {
              group: ["@/modules/*/*", "@/modules/*/*/**"],
              message:
                "Import another module through its public entry point (@/modules/<name>), or use a relative import within the same module.",
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
