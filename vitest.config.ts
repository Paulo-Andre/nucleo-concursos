import "dotenv/config";
import { configDefaults, defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);
const suite = process.env.TEST_SUITE ?? "unit";
const integration = ["server/**/*.integration.test.ts"];
const services = ["server/**/*.credentials.test.ts"];
if (!["unit", "integration", "services"].includes(suite)) throw new Error("TEST_SUITE inválida");
if (suite === "integration") {
  if (!process.env.TEST_DATABASE_URL || process.env.ALLOW_TEST_DATABASE_WRITES !== "true") {
    throw new Error("Use TEST_DATABASE_URL de um banco descartável e ALLOW_TEST_DATABASE_WRITES=true.");
  }
  if (process.env.TEST_DATABASE_URL === process.env.DATABASE_URL) {
    throw new Error("O banco de testes deve ser diferente de DATABASE_URL.");
  }
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
if (suite === "services" && process.env.ALLOW_LIVE_SERVICE_TESTS !== "true") {
  throw new Error("Use ALLOW_LIVE_SERVICE_TESTS=true para testar credenciais reais.");
}

export default defineConfig({
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "client", "src"),
      "@shared": path.resolve(templateRoot, "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: suite === "integration" ? integration : suite === "services" ? services : ["server/**/*.test.ts", "server/**/*.spec.ts", "client/src/**/*.test.ts"],
    exclude: [...configDefaults.exclude, ...(suite === "unit" ? [...integration, ...services] : [])],
    setupFiles: suite === "unit" ? ["server/test/unitSetup.ts"] : [],
    fileParallelism: false,
  },
});
