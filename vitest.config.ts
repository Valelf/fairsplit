import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: { include: ["**/*.test.ts"], exclude: ["**/node_modules/**", ".next/**", ".claude/**", "e2e/**"] },
  resolve: { alias: { "@": path.resolve(__dirname) } },
});
