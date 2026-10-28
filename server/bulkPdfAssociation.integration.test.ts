import { eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { adminAuditLogs, contentChangelog, contents, disciplineContents, disciplines } from "../drizzle/schema";
import { getDb, getUserByUsername } from "./db";
import { confirmBulkPdfAssociation, listBulkPdfAssociations, moveBulkPdfAssociation, previewBulkPdfAssociation } from "./bulkPdfAssociation";

describe("associação de apostilas por disciplina, em lote", () => {
  it("vincula o PDF a todos os capítulos de uma aula sem afetar outra disciplina", async () => {
    const db = await getDb();
    const admin = await getUserByUsername("paulo");
    expect(db).toBeTruthy();
    expect(admin?.role).toBe("admin");
    if (!db || !admin) return;

    const code = crypto.randomUUID().slice(0, 8);
    const inserted: number[] = [];
    const disciplineIds: number[] = [];
    try {
      const ds = await db.insert(disciplines).values([
        { name: `Português Lote ${code}`, shortName: `pl${code}`, status: "published", createdByUserId: admin.id, updatedByUserId: admin.id },
        { name: `Direito Lote ${code}`, shortName: `dl${code}`, status: "published", createdByUserId: admin.id, updatedByUserId: admin.id },
      ]);
      const base = Number(ds[0].insertId);
      disciplineIds.push(base, base + 1);
      const r = await db.insert(contents).values([
        { title: "Aula 01 - 01 - Capítulo importado " + code, body: "Corpo preservado", status: "draft", createdByUserId: admin.id, updatedByUserId: admin.id },
        { title: "Aula 01 — 02. Capítulo importado " + code, status: "draft", createdByUserId: admin.id, updatedByUserId: admin.id },
        { title: "Aula 01 - Direito, não associar " + code, status: "draft", createdByUserId: admin.id, updatedByUserId: admin.id },
        { title: "Aula 02 - Novo destino Português " + code, status: "draft", createdByUserId: admin.id, updatedByUserId: admin.id },
      ]);
      const first = Number(r[0].insertId);
      inserted.push(first, first + 1, first + 2, first + 3);
      await db.insert(disciplineContents).values([
        { disciplineId: base, contentId: first, linkedByUserId: admin.id },
        { disciplineId: base, contentId: first + 1, linkedByUserId: admin.id },
        { disciplineId: base + 1, contentId: first + 2, linkedByUserId: admin.id },
        { disciplineId: base, contentId: first + 3, linkedByUserId: admin.id },
      ]);
      const fileName = "pl" + code + "_Aula_01.pdf";
      const preview = await previewBulkPdfAssociation(base, [{ fileName }], false);
      expect(preview).toMatchObject({ totalFiles: 1, totalAssociations: 2, unmatched: [] });
      const url = `/manus-storage/content-pdfs/${admin.id}/${crypto.randomUUID()}_abcdef12.pdf`;
      const saved = await confirmBulkPdfAssociation(admin.id, {
        disciplineId: base, files: [{ fileName, url }], replaceExisting: false, expectedCount: 2,
      });
      expect(saved).toEqual({ associated: 2, uploaded: 1 });
      const rows = await db.select().from(contents).where(inArray(contents.id, inserted));
      expect(rows.find(x => x.id === first)).toMatchObject({materialUrl: url, body: "Corpo preservado", status: "draft"});
      expect(rows.find(x => x.id === first + 1)?.materialLabel).toContain(fileName);
      expect(rows.find(x => x.id === first + 2)?.materialUrl).toBeNull();

      await expect(confirmBulkPdfAssociation(admin.id, {
        disciplineId: base, files: [{ fileName, url }], replaceExisting: false, expectedCount: 2,
      })).rejects.toThrow(/prévia|conteúdo disponível/i);
      const next = await previewBulkPdfAssociation(base, [{ fileName }], false);
      expect(next.totalAssociations).toBe(0);
      const existing = await listBulkPdfAssociations(base);
      expect(existing.groups).toHaveLength(1);
      expect(existing.groups[0].contentIds).toEqual([first, first + 1]);
      expect(existing.groups[0].contents.map(row => row.title)).toHaveLength(2);

      // A revisão posterior muda a aula sem reenviar o PDF; a disciplina de Direito
      // não pode receber o arquivo de Português por acidente.
      await expect(moveBulkPdfAssociation(admin.id, {
        disciplineId: base, sourceUrl: url, targetLesson: 2, replaceExisting: false,
        expectedSourceContentIds: [first],
      })).rejects.toThrow(/vínculos foram alterados/);
      const moved = await moveBulkPdfAssociation(admin.id, {
        disciplineId: base, sourceUrl: url, targetLesson: 2, replaceExisting: false,
        expectedSourceContentIds: [first, first + 1],
      });
      expect(moved).toMatchObject({ updated: 3, targetLesson: 2, targetKey: "aula:2" });
      const movedContents = await db.select().from(contents).where(inArray(contents.id, inserted));
      expect(movedContents.find(row => row.id === first)?.materialUrl).toBeNull();
      expect(movedContents.find(row => row.id === first + 1)?.materialUrl).toBeNull();
      expect(movedContents.find(row => row.id === first + 3)?.materialUrl).toBe(url);
      expect(movedContents.find(row => row.id === first + 2)?.materialUrl).toBeNull();
      const current = await listBulkPdfAssociations(base);
      expect(current.groups[0].lessons).toEqual([2]);
      expect(current.groups[0].contentIds).toEqual([first + 3]);
      const afterMove = await previewBulkPdfAssociation(base, [{ fileName, targetLesson: 2 }], false);
      expect(afterMove.mappings[0].alreadyHasPdf).toBe(1);

      const audits = await db.select().from(adminAuditLogs).where(eq(adminAuditLogs.action, "IMPORTACAO_PDFS_EM_LOTE"));
      expect(audits.some(x => x.detail.includes("disciplina " + base))).toBe(true);
    } finally {
      if (inserted.length) {
        await db.delete(contentChangelog).where(inArray(contentChangelog.contentId, inserted));
        await db.delete(disciplineContents).where(inArray(disciplineContents.contentId, inserted));
        await db.delete(contents).where(inArray(contents.id, inserted));
      }
      if (disciplineIds.length) {
        await db.delete(disciplines).where(inArray(disciplines.id, disciplineIds));
        for (const id of disciplineIds) {
          await db.delete(adminAuditLogs).where(eq(adminAuditLogs.detail, `1 apostila(s) vinculada(s) a 2 conteúdo(s) da disciplina ${id}.`));
        }
      }
    }
  }, 30000);
});
