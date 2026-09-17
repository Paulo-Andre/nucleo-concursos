import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { gzipSync } from "node:zlib";
import mysql, { type RowDataPacket } from "mysql2/promise";
import { backupTables, decodeRestoreBackup, restoreBackup } from "../restoreBackup";
import { databaseOptions } from "../databaseConfig";

// Only the disposable CI database; no production values or customer fixtures.
assert.equal(process.env.CI, "true");
assert.equal(process.env.NODE_ENV, "test");
assert.equal(new URL(process.env.DATABASE_URL!).hostname, "127.0.0.1");
const data: Record<string, Record<string, unknown>[]> = Object.fromEntries(backupTables.map(table => [table, []]));
data.users = [{ id: 42, openId: "legacy:paulo", username: "paulo", name: "CI root", role: "admin", createdAt: "2026-01-02T03:04:05.000Z" }];
data.courses = [{ id: "ci-restore", title: "Restored course", track: "ci", createdByUserId: 42 }];
function environment(rows = data) {
  const raw = Buffer.from(JSON.stringify({ format: "nucleo-concursos-logical-backup", version: 1, data: rows, tableCounts: Object.fromEntries(Object.entries(rows).map(([key, value]) => [key, value.length])) }));
  return { ...process.env, RESTORE_BACKUP_PARTS: "1", RESTORE_BACKUP_1: gzipSync(raw).toString("base64"), RESTORE_BACKUP_SHA256: createHash("sha256").update(raw).digest("hex") };
}
const env = environment();
assert.throws(() => decodeRestoreBackup({ ...env, RESTORE_BACKUP_SHA256: "wrong" }), /RESTORE_HASH_MISMATCH/);
assert.throws(() => decodeRestoreBackup({ ...env, RESTORE_BACKUP_PARTS: "2" }), /RESTORE_INVALID_PARTS/);
async function main() {
const connection = await mysql.createConnection({ ...databaseOptions(), timezone: "Z" });
try {
  await assert.rejects(restoreBackup(environment({ ...data, courses: [{ ...data.courses[0], invalidColumn: "must rollback" }] })), /RESTORE_INVALID_COLUMN/);
  const [empty] = await connection.query<RowDataPacket[]>("SELECT COUNT(*) AS n FROM users");
  assert.equal(Number(empty[0].n), 0, "failed import rolls back already inserted users");
  await connection.query("INSERT INTO users (openId, name) VALUES ('ci-existing', 'Existing')");
  await assert.rejects(restoreBackup(env), /RESTORE_DATABASE_NOT_EMPTY/);
  await connection.query("DELETE FROM users WHERE openId = 'ci-existing'");
  await restoreBackup(env);
  await restoreBackup(env);
  const [users] = await connection.query<RowDataPacket[]>("SELECT id, username, passwordHash, createdAt FROM users");
  assert.equal(users.length, 1);
  assert.equal(users[0].id, 42);
  assert.equal(users[0].username, "paulo");
  assert.equal(users[0].passwordHash, null);
  assert.equal(users[0].createdAt.toISOString(), "2026-01-02T03:04:05.000Z");
  await assert.rejects(restoreBackup(environment({ ...data, courses: [] })), /RESTORE_DIFFERENT_BACKUP_ALREADY_IMPORTED/);
  console.log("Restore smoke passed: rollback, occupied database, idempotence, identity and dates.");
} finally {
  await connection.end();
}
}
main().catch(error => { console.error(error); process.exitCode = 1; });
