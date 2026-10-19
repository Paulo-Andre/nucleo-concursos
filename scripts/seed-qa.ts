import { ensureRootAccount } from "../server/auth/rootBootstrap";

// Somente ambiente de QA com DATABASE_URL e ROOT_INITIAL_PASSWORD próprios.
if (process.env.NODE_ENV === "production") throw new Error("Seed QA não deve executar em produção.");
try {
  await ensureRootAccount();
  console.log("Conta e biblioteca de QA preparadas.");
  // O pool MySQL mantém conexões abertas; o processo de seed isolado deve terminar explicitamente.
  process.exit(0);
} catch (error) {
  console.error("Falha ao preparar dados de QA:", error instanceof Error ? error.message : "erro desconhecido");
  process.exit(1);
}
