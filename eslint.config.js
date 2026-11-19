import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import ts from "typescript-eslint";
export default defineConfig([
  {
    ignores: [
      "dist/**",
      "supabase/functions/**",
      "test-results/**",
      "playwright-report/**",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...ts.configs.recommended],
  },
]);
