import { ensureRootAccount } from "../server/auth/rootBootstrap";

// Somente ambiente de QA com DATABASE_URL e ROOT_INITIAL_PASSWORD próprios.
if (process.env.NODE_ENV === "production") throw new Error("Seed QA não deve executar em produção.");
await ensureRootAccount();
console.log("Conta e biblioteca de QA preparadas.");
