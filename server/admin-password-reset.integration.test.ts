import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { adminAuditLogs, authSessions, passwordResetTokens } from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import { createSessionToken, hashPassword, hashSessionToken, verifyPassword } from "./auth/localAuth";
import {
  createLocalUser, createPasswordResetToken, deleteManagedUser, getDb,
  getUserById, getUserFromSessionHash, replaceSessionForUser,
} from "./db";
import { appRouter } from "./routers";

describe("redefinição de senha pelo administrador ROOT", () => {
  it("troca somente a senha da conta escolhida, encerra suas sessões e registra auditoria", async () => {
    const db = await getDb();
    expect(db).toBeTruthy();
    if (!db) return;

    const suffix = Date.now().toString(36);
    const admin = await createLocalUser({
      name: "Administrador temporário QA",
      username: `qa-root-${suffix}`,
      email: `qa-root-${suffix}@example.invalid`,
      passwordHash: await hashPassword("AntigaSenhaAdmin123"),
      role: "admin",
    });
    const student = await createLocalUser({
      name: "Aluno temporário QA",
      username: `qa-aluno-${suffix}`,
      email: `qa-aluno-${suffix}@example.invalid`,
      passwordHash: await hashPassword("AntigaSenhaAluno123"),
    });
    const studentTokenHash = hashSessionToken(createSessionToken());
    const adminTokenHash = hashSessionToken(createSessionToken());
    try {
      await replaceSessionForUser(student.id, crypto.randomUUID(), studentTokenHash, new Date(Date.now() + 600_000));
      await replaceSessionForUser(admin.id, crypto.randomUUID(), adminTokenHash, new Date(Date.now() + 600_000));
      await createPasswordResetToken(student.id, hashSessionToken(createSessionToken()), new Date(Date.now() + 600_000));

      const caller = appRouter.createCaller({
        user: admin,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      });
      await expect(caller.admin.resetPassword({ userId: student.id, newPassword: "NovaSenhaAluno123", confirmation: "nao-confere" }))
        .rejects.toMatchObject({ code: "BAD_REQUEST" });
      expect(await verifyPassword("AntigaSenhaAluno123", (await getUserById(student.id))!.passwordHash!)).toBe(true);

      await expect(caller.admin.resetPassword({ userId: student.id, newPassword: "NovaSenhaAluno123", confirmation: "NovaSenhaAluno123" }))
        .resolves.toEqual({ success: true });

      const after = await getUserById(student.id);
      expect(after?.passwordHash).toBeTruthy();
      expect(await verifyPassword("NovaSenhaAluno123", after!.passwordHash!)).toBe(true);
      expect(await verifyPassword("AntigaSenhaAluno123", after!.passwordHash!)).toBe(false);
      expect(await getUserFromSessionHash(studentTokenHash)).toBeUndefined();
      expect(await getUserFromSessionHash(adminTokenHash)).toMatchObject({ id: admin.id });
      expect(await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.userId, student.id))).toHaveLength(0);
      const audits = await db.select().from(adminAuditLogs).where(eq(adminAuditLogs.affectedUserId, student.id));
      expect(audits).toHaveLength(1);
      expect(audits[0]).toMatchObject({ actorUserId: admin.id, action: "REDEFINICAO_DE_SENHA" });
      expect(audits[0].detail).not.toContain("NovaSenhaAluno123");

      await expect(caller.admin.resetPassword({ userId: 2147483647, newPassword: "NovaSenhaAluno123", confirmation: "NovaSenhaAluno123" }))
        .rejects.toMatchObject({ code: "NOT_FOUND" });
    } finally {
      await db.delete(adminAuditLogs).where(eq(adminAuditLogs.affectedUserId, student.id));
      await db.delete(authSessions).where(eq(authSessions.userId, admin.id));
      await deleteManagedUser(student.id);
      await deleteManagedUser(admin.id);
    }
  });
});
