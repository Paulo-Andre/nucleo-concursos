import { and, eq, isNull } from "drizzle-orm";
import { adminAuditLogs, contentChangelog, contents, disciplineContents, disciplines } from "../drizzle/schema";
import { getDb } from "./db";
import { mapPdfFilesToContents, type PdfMappingFile } from "./bulkPdfMapping";

/** Apenas conteúdos vinculados à disciplina escolhida podem receber os PDFs. */
async function contentsForDiscipline(disciplineId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const discipline = await db.select({ id: disciplines.id }).from(disciplines).where(eq(disciplines.id, disciplineId)).limit(1);
  if (!discipline.length) throw new Error("Disciplina não encontrada. Cadastre e selecione a disciplina antes de importar.");
  return db.select({ id: contents.id, title: contents.title, materialUrl: contents.materialUrl })
    .from(disciplineContents).innerJoin(contents, eq(disciplineContents.contentId, contents.id))
    .where(eq(disciplineContents.disciplineId, disciplineId));
}

export async function previewBulkPdfAssociation(disciplineId: number, fileNames: string[], replaceExisting: boolean) {
  const rows = await contentsForDiscipline(disciplineId);
  const mapping = mapPdfFilesToContents({ contents: rows, files: fileNames.map(fileName => ({ fileName })), replaceExisting });
  return { ...mapping, disciplineId, totalContentsInDiscipline: rows.length };
}

export async function confirmBulkPdfAssociation(actorUserId: number, input: {
  disciplineId: number;
  files: PdfMappingFile[];
  replaceExisting: boolean;
  expectedCount: number;
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const rows = await contentsForDiscipline(input.disciplineId);
  const plan = mapPdfFilesToContents({ contents: rows, files: input.files, replaceExisting: input.replaceExisting });
  if (plan.unmatched.length) throw new Error("Algumas apostilas não correspondem a nenhuma aula da disciplina. Revise os nomes.");
  if (!plan.totalAssociations) throw new Error("Nenhum conteúdo disponível para associar. Confira as aulas e a opção de substituir PDFs existentes.");
  if (plan.totalAssociations !== input.expectedCount) throw new Error("As aulas mudaram desde a prévia. Faça uma nova conferência antes de salvar.");

  const byId = new Map(rows.map(row => [row.id, row]));
  const fileByLesson = new Map<number, string>();
  for (const file of input.files) {
    // Verifica que o arquivo veio da área privada de uploads do próprio administrador.
    const prefix = `/manus-storage/content-pdfs/${actorUserId}/`;
    const relative = file.url?.slice(prefix.length) ?? "";
    if (!file.url?.startsWith(prefix) || !/^[a-f0-9-]{36}_[a-f0-9]{8}\.pdf$/i.test(relative))
      throw new Error(`Arquivo PDF não autorizado para associação: ${file.fileName}`);
    const entry = plan.mappings.find(mapped => mapped.fileName === file.fileName);
    if (!entry) throw new Error("A prévia dos documentos mudou.");
    fileByLesson.set(entry.lesson, file.url);
  }

  // As atualizações e o histórico entram na mesma transação: não há associação parcial no banco.
  await db.transaction(async tx => {
    for (const entry of plan.mappings) {
      const url = fileByLesson.get(entry.lesson);
      if (!url) throw new Error("Apostila ausente durante a confirmação.");
      const label = `Apostila da Aula ${String(entry.lesson).padStart(2, "0")}`;
      for (const contentId of entry.contentIds) {
        const old = byId.get(contentId);
        if (!old) throw new Error("Conteúdo não encontrado durante a confirmação.");
        // Confere a versão do vínculo na transação; evita substituir um PDF
        // associado por outro administrador enquanto o lote era enviado.
        const condition = old.materialUrl === null
          ? isNull(contents.materialUrl)
          : eq(contents.materialUrl, old.materialUrl);
        const result = await tx.update(contents)
          .set({ materialUrl: url, materialLabel: label, updatedByUserId: actorUserId })
          .where(and(eq(contents.id, contentId), condition));
        if (result[0].affectedRows !== 1) throw new Error("Uma aula foi alterada durante o envio. Nenhuma associação foi concluída; confira e tente novamente.");
        await tx.insert(contentChangelog).values({
          contentId, actorUserId, changedField: "materialUrl",
          oldValue: old.materialUrl, newValue: url,
        });
      }
    }
    await tx.insert(adminAuditLogs).values({
      actorUserId, action: "IMPORTACAO_PDFS_EM_LOTE",
      detail: `${plan.totalFiles} apostila(s) vinculada(s) a ${plan.totalAssociations} conteúdo(s) da disciplina ${input.disciplineId}.`,
    });
  });
  return { associated: plan.totalAssociations, uploaded: plan.totalFiles };
}
