import { createHash } from "node:crypto";
import { gunzipSync } from "node:zlib";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { databaseOptions } from "./databaseConfig";

export const backupTables = [
  "users", "studyProfiles", "completedModules", "studyAnswers", "studyReviewItems",
  "simulationRecords", "studyNotes", "studyContentProgress", "studyRoadmapItems", "adminAuditLogs",
  "courses", "commercePlans", "commercePlanCourses", "commerceCoupons", "commerceOrders",
  "commerceOrderItems", "commerceTransactions", "courseEnrollments", "disciplines", "contents",
  "questions", "courseDisciplines", "disciplineContents", "questionContentLinks", "simulationQuestions",
  "reviewQueue", "questionChangelog", "contentChangelog", "globalContactSettings", "platformAlerts",
  "platformAlertDismissals",
] as const;
const tables = backupTables;
type Backup = { data: Record<string, Record<string, unknown>[]>; tableCounts: Record<string, number> };

export function decodeRestoreBackup(env = process.env): { backup: Backup; hash: string } | null {
  if (!env.RESTORE_BACKUP_PARTS) return null;
  const count = Number(env.RESTORE_BACKUP_PARTS);
  if (!Number.isInteger(count) || count < 1 || count > 32) throw new Error("RESTORE_INVALID_PARTS");
  const parts = Array.from({ length: count }, (_, i) => env[`RESTORE_BACKUP_${i + 1}`]);
  if (parts.some(part => !part || !/^[A-Za-z0-9+/=]+$/.test(part))) throw new Error("RESTORE_INVALID_PARTS");
  const raw = gunzipSync(Buffer.from(parts.join(""), "base64"), { maxOutputLength: 25 * 1024 * 1024 });
  const hash = createHash("sha256").update(raw).digest("hex");
  if (hash !== env.RESTORE_BACKUP_SHA256) throw new Error("RESTORE_HASH_MISMATCH");
  const backup = JSON.parse(raw.toString("utf8"));
  if (backup.format !== "nucleo-concursos-logical-backup" || backup.version !== 1 || !backup.data || !backup.tableCounts) {
    throw new Error("RESTORE_INVALID_FORMAT");
  }
  if (Object.keys(backup.data).length !== tables.length || Object.keys(backup.tableCounts).length !== tables.length) {
    throw new Error("RESTORE_INVALID_TABLES");
  }
  for (const table of tables) {
    const rows = backup.data[table];
    if (!Array.isArray(rows) || rows.length !== backup.tableCounts[table] || rows.some(row => !row || Array.isArray(row) || typeof row !== "object")) {
      throw new Error("RESTORE_INVALID_ROWS");
    }
  }
  if (backup.data.users.filter((row: Record<string, unknown>) => row.username === "paulo").length !== 1) {
    throw new Error("RESTORE_ROOT_MISSING_OR_DUPLICATED");
  }
  return { backup, hash };
}

/** Run after migrations and before any application/bootstrap process starts. */
export async function restoreBackup(env = process.env) {
  const input = decodeRestoreBackup(env);
  if (!input) return;
  const { connectionLimit, waitForConnections, queueLimit, ...options } = databaseOptions(env);
  const connection = await mysql.createConnection({ ...options, timezone: "Z" });
  let transaction = false;
  const lock = `restore:${createHash("sha256").update(String(options.database)).digest("hex").slice(0, 40)}`;
  try {
    const [locks] = await connection.query<RowDataPacket[]>("SELECT GET_LOCK(?, 10) AS acquired", [lock]);
    if (locks[0]?.acquired !== 1) throw new Error("RESTORE_LOCK_UNAVAILABLE");
    await connection.query("SET SESSION time_zone = '+00:00'");
    await connection.query("SET SESSION sql_mode = 'STRICT_ALL_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION'");
    await connection.query("CREATE TABLE IF NOT EXISTS `_nucleo_backup_restore` (`sha256` char(64) PRIMARY KEY, `completedAt` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP) ENGINE=InnoDB");
    const [history] = await connection.query<RowDataPacket[]>("SELECT sha256 FROM `_nucleo_backup_restore`");
    if (history.some(row => row.sha256 === input.hash)) {
      console.log("[Restore] Backup já restaurado; nenhuma alteração.");
      return;
    }
    if (history.length) throw new Error("RESTORE_DIFFERENT_BACKUP_ALREADY_IMPORTED");
    const [schemaTables] = await connection.query<RowDataPacket[]>(
      "SELECT TABLE_NAME AS name, ENGINE AS engine FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE()",
    );
    await connection.beginTransaction();
    transaction = true;
    for (const table of schemaTables) {
      if (["__drizzle_migrations", "_nucleo_backup_restore"].includes(table.name)) continue;
      if (table.engine !== "InnoDB") throw new Error("RESTORE_REQUIRES_TRANSACTIONAL_TABLES");
      const [rows] = await connection.query<RowDataPacket[]>(`SELECT 1 FROM ${mysql.escapeId(table.name)} LIMIT 1 FOR UPDATE`);
      if (rows.length) throw new Error("RESTORE_DATABASE_NOT_EMPTY");
    }
    for (const table of tables) {
      const [columns] = await connection.query<RowDataPacket[]>(
        "SELECT COLUMN_NAME AS name, DATA_TYPE AS type FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?", [table],
      );
      if (!columns.length) throw new Error("RESTORE_TABLE_MISSING");
      const types = new Map(columns.map(column => [column.name, column.type]));
      for (const row of input.backup.data[table]) {
        const keys = Object.keys(row);
        if (!keys.length || keys.some(key => !types.has(key) || /password|token|secret/i.test(key))) throw new Error("RESTORE_INVALID_COLUMN");
        const values = keys.map(key => {
          const value = row[key];
          if (value === null) return null;
          if (["timestamp", "datetime"].includes(types.get(key))) {
            if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T.*Z$/.test(value) || !Number.isFinite(Date.parse(value))) throw new Error("RESTORE_INVALID_DATE");
            return new Date(value);
          }
          if (!["string", "boolean", "number"].includes(typeof value)) throw new Error("RESTORE_INVALID_VALUE");
          return value;
        });
        await connection.query(`INSERT INTO ${mysql.escapeId(table)} (${keys.map(key => mysql.escapeId(key)).join(",")}) VALUES (${keys.map(() => "?").join(",")})`, values);
      }
      const [count] = await connection.query<RowDataPacket[]>(`SELECT COUNT(*) AS n FROM ${mysql.escapeId(table)}`);
      if (Number(count[0].n) !== input.backup.tableCounts[table]) throw new Error("RESTORE_COUNT_MISMATCH");
      console.log(`[Restore] ${table}: ${count[0].n}`);
    }
    await connection.query("INSERT INTO `_nucleo_backup_restore` (sha256) VALUES (?)", [input.hash]);
    await connection.commit();
    transaction = false;
    console.log("[Restore] Backup restaurado e contagens verificadas. Remova as variáveis RESTORE_BACKUP_*.");
  } catch (error) {
    if (transaction) await connection.rollback();
    // Do not log driver messages: they can contain private backup values.
    const reason = error instanceof Error && /^RESTORE_[A-Z_]+$/.test(error.message) ? error.message : "RESTORE_FAILED";
    throw new Error(reason);
  } finally {
    await connection.query("SELECT RELEASE_LOCK(?)", [lock]).catch(() => {});
    await connection.end();
  }
}
