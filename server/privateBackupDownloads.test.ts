import { readFile, stat } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createPrivateBackupDownload, disposePrivateBackupDownload, takePrivateBackupDownload } from "./privateBackupDownloads";

describe("download de backup com autorização ROOT", () => {
  it("mantém o backup privado, vinculado à conta e com token de uso único", async () => {
    const output = await createPrivateBackupDownload(7, "copia.json", '{"cpf":"dados-de-teste"}');
    expect(output.downloadUrl).toMatch(/^\/api\/admin\/backups\/[a-f0-9]{64}$/);
    expect(output.downloadUrl).not.toContain("manus-storage");
    const token = output.downloadUrl.split("/").pop()!;
    expect(takePrivateBackupDownload(token, 8)).toBeNull();
    const reserved = takePrivateBackupDownload(token, 7);
    expect(reserved).not.toBeNull();
    if (!reserved) throw new Error("Arquivo privado não reservado");
    expect(reserved.filePath).not.toContain("uploads");
    expect((await stat(reserved.filePath)).mode & 0o777).toBe(0o600);
    expect(await readFile(reserved.filePath, "utf8")).toContain("dados-de-teste");
    expect(takePrivateBackupDownload(token, 7)).toBeNull();
    await disposePrivateBackupDownload(reserved);
    await expect(stat(reserved.filePath)).rejects.toMatchObject({ code: "ENOENT" });
  });

  it("rejeita tokens incompletos e malformados", () => {
    expect(takePrivateBackupDownload("../etc/passwd", 7)).toBeNull();
    expect(takePrivateBackupDownload("abc", 7)).toBeNull();
  });
});
