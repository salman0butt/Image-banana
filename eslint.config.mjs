import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // This copied AI Elements catalog is not imported by the production editor.
    // Keep it isolated until it is removed or intentionally adopted and audited.
    "components/ai-elements/**",
  ]),
]);

export default eslintConfig;
