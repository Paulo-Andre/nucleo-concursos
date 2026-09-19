import "dotenv/config";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { databaseOptions } from "./databaseConfig";
import { validateRuntimeEnvironment } from "./runtimeConfig";

let stage = "environment";
async function main() {
  validateRuntimeEnvironment();
  const { connectionLimit, waitForConnections, queueLimit, ...options } = databaseOptions();
  stage = "connect";
  const connection = await mysql.createConnection(options);
  try {
    stage = "history";
    const [tables] = await connection.query<RowDataPacket[]>(
      "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()",
    );
    // Never guess a baseline for an imported/partially migrated database.
    const hasApplicationTables = tables.some(table => table.name !== "__drizzle_migrations");
    const hasJournal = tables.some(table => table.name === "__drizzle_migrations");
    let hasHistory = false;
    if (hasJournal) {
      const [history] = await connection.query<RowDataPacket[]>("SELECT id FROM __drizzle_migrations LIMIT 1");
      hasHistory = history.length > 0;
    }
    if (hasApplicationTables && !hasHistory) {
      throw new Error("MIGRATION_BASELINE_REQUIRED");
    }
    stage = "migrate";
    await migrate(drizzle(connection), { migrationsFolder: "./drizzle" });
    console.log("[Migrations] Migrações aplicadas.");
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  // Only fixed driver codes are safe to log; messages and SQL may contain secrets.
  const knownCodes = new Set(["ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "ECONNRESET", "ER_ACCESS_DENIED_ERROR", "ER_BAD_DB_ERROR", "ER_CON_COUNT_ERROR", "ER_TOO_MANY_USER_CONNECTIONS", "HANDSHAKE_SSL_ERROR", "CERT_HAS_EXPIRED", "UNABLE_TO_VERIFY_LEAF_SIGNATURE", "SELF_SIGNED_CERT_IN_CHAIN", "ER_DUP_FIELDNAME", "ER_TABLE_EXISTS_ERROR", "ER_PARSE_ERROR"]);
  let cause: unknown = error;
  let code = "UNKNOWN";
  for (let depth = 0; depth < 5 && cause && typeof cause === "object"; depth++) {
    const detail = cause as { code?: unknown; cause?: unknown };
    if (typeof detail.code === "string" && knownCodes.has(detail.code)) {
      code = detail.code;
      break;
    }
    cause = detail.cause;
  }
  console.error(`[Migrations] stage=${stage} code=${code}`);
  if (process.env.NODE_ENV === "test" && process.env.CI === "true") console.error(error);
  if (error instanceof Error && error.message === "MIGRATION_BASELINE_REQUIRED") {
    console.error("[Migrations] Banco existente sem histórico. Restaure também __drizzle_migrations ou reconcilie o esquema antes de continuar. Consulte DEPLOY_RENDER.md.");
  } else {
    // Driver errors may contain SQL, credentials or connection URLs.
    console.error("[Migrations] Falha. Confira conexão TLS, variáveis e histórico das migrações. Nenhuma falha é ignorada; não reinicie uma migração parcial sem revisão.");
  }
  process.exitCode = 1;
});
