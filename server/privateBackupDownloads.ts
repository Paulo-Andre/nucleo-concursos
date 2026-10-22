import { randomBytes } from "node:crypto";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

const DOWNLOAD_LIFETIME_MS = 5 * 60 * 1000;

type PrivateBackup = {
  actorUserId: number;
  directory: string;
  filePath: string;
  fileName: string;
  expiresAt: number;
  expiryTimer: ReturnType<typeof setTimeout>;
};

const pending = new Map<string, PrivateBackup>();

async function discard(backup: PrivateBackup) {
  clearTimeout(backup.expiryTimer);
  await rm(backup.directory, { recursive: true, force: true });
}

/**
 * O arquivo nunca passa por /manus-storage nem pelo diretório de uploads.
 * O token é aleatório, efêmero, de uso único e vinculado ao ROOT que exportou.
 */
export async function createPrivateBackupDownload(actorUserId: number, fileName: string, content: string) {
  const token = randomBytes(32).toString("hex");
  const directory = await mkdtemp(path.join(tmpdir(), "nucleo-private-backup-"));
  const filePath = path.join(directory, "backup.json");
  try {
    await writeFile(filePath, content, { encoding: "utf8", mode: 0o600, flag: "wx" });
  } catch (error) {
    await rm(directory, { recursive: true, force: true });
    throw error;
  }

  const expiresAt = Date.now() + DOWNLOAD_LIFETIME_MS;
  const expiryTimer = setTimeout(() => {
    const backup = pending.get(token);
    if (!backup) return;
    pending.delete(token);
    void discard(backup).catch(() => {});
  }, DOWNLOAD_LIFETIME_MS);
  expiryTimer.unref();

  pending.set(token, { actorUserId, directory, filePath, fileName, expiresAt, expiryTimer });
  return { downloadUrl: `/api/admin/backups/${token}`, expiresAt: new Date(expiresAt).toISOString() };
}

export function takePrivateBackupDownload(token: string, actorUserId: number) {
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const backup = pending.get(token);
  if (!backup || backup.actorUserId !== actorUserId) return null;
  pending.delete(token);
  clearTimeout(backup.expiryTimer);
  if (backup.expiresAt <= Date.now()) {
    void discard(backup).catch(() => {});
    return null;
  }
  return backup;
}

export async function disposePrivateBackupDownload(backup: NonNullable<ReturnType<typeof takePrivateBackupDownload>>) {
  await discard(backup);
}
