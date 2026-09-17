import "dotenv/config";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { databaseOptions } from "./databaseConfig";
import { validateRuntimeEnvironment } from "./runtimeConfig";

async function main() {
  validateRuntimeEnvironment();
  const { connectionLimit, waitForConnections, queueLimit, ...options } = databaseOptions();
  const connection = await mysql.createConnection(options);
  try {
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
    await migrate(drizzle(connection), { migrationsFolder: "./drizzle" });
    console.log("[Migrations] Migrações aplicadas.");
  } finally {
    await connection.end();
  }
}

main().catch(error => {
  if (error instanceof Error && error.message === "MIGRATION_BASELINE_REQUIRED") {
    console.error("[Migrations] Banco existente sem histórico. Restaure também __drizzle_migrations ou reconcilie o esquema antes de continuar. Consulte DEPLOY_RENDER.md.");
  } else {
    // Driver errors may contain SQL, credentials or connection URLs.
    console.error("[Migrations] Falha. Confira conexão TLS, variáveis e histórico das migrações. Nenhuma falha é ignorada; não reinicie uma migração parcial sem revisão.");
  }
  process.exitCode = 1;
});
