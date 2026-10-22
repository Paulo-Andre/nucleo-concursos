import { defineConfig } from "vitest/config";
import path from "path";

const templateRoot = path.resolve(import.meta.dirname);

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
    // O renderizador Markdown carrega estilos KaTeX. Transformar o módulo pelo
    // Vite evita que o Node tente importar diretamente arquivos .css em testes SSR.
    css: true,
    server: { deps: { inline: ["streamdown", "katex"] } },
    include: ["server/**/*.test.ts", "server/**/*.spec.ts", "client/src/**/*.test.ts"],
  },
});
