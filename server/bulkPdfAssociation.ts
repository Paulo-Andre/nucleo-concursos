import { and, eq, inArray, isNull } from "drizzle-orm";
import { adminAuditLogs, contentChangelog, contents, disciplineContents, disciplines } from "../drizzle/schema";
import { getDb } from "./db";
import { lessonNumberFromContentTitle, mapPdfFilesToContents, type PdfMappingFile } from "./bulkPdfMapping";

/** Apenas conteúdos vinculados à disciplina escolhida podem receber os PDFs. */
async function contentsForDiscipline(disciplineId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  const discipline = await db.select({ id: disciplines.id }).from(disciplines).where(eq(disciplines.id, disciplineId)).limit(1);
  if (!discipline.length) throw new Error("Disciplina não encontrada. Cadastre e selecione a disciplina antes de importar.");
  return db.select({ id: contents.id, title: contents.title, materialUrl: contents.materialUrl, materialLabel: contents.materialLabel })
    .from(disciplineContents).innerJoin(contents, eq(disciplineContents.contentId, contents.id))
    .where(eq(disciplineContents.disciplineId, disciplineId));
}

export async function previewBulkPdfAssociation(disciplineId: number, files: Pick<PdfMappingFile, "fileName" | "targetLesson">[], replaceExisting: boolean) {
  const rows = await contentsForDiscipline(disciplineId);
  const mapping = mapPdfFilesToContents({ contents: rows, files, replaceExisting });
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
  const fileByLesson = new Map<number, { url: string; fileName: string }>();
  for (const file of input.files) {
    // Verifica que o arquivo veio da área privada de uploads do próprio administrador.
    const prefix = `/manus-storage/content-pdfs/${actorUserId}/`;
    const relative = file.url?.slice(prefix.length) ?? "";
    if (!file.url?.startsWith(prefix) || !/^[a-f0-9-]{36}_[a-f0-9]{8}\.pdf$/i.test(relative))
      throw new Error(`Arquivo PDF não autorizado para associação: ${file.fileName}`);
    const entry = plan.mappings.find(mapped => mapped.fileName === file.fileName);
    if (!entry) throw new Error("A prévia dos documentos mudou.");
    fileByLesson.set(entry.lesson, { url: file.url, fileName: file.fileName });
  }

  // As atualizações e o histórico entram na mesma transação: não há associação parcial no banco.
  await db.transaction(async tx => {
    for (const entry of plan.mappings) {
      const selected = fileByLesson.get(entry.lesson);
      if (!selected) throw new Error("Apostila ausente durante a confirmação.");
      const url = selected.url;
      const label = `Apostila da Aula ${String(entry.lesson).padStart(2, "0")} — ${selected.fileName}`.slice(0, 160);
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


/** Consulta auditável dos PDFs associados: nenhuma URL direta é exposta aos alunos sem matrícula. */
export async function listBulkPdfAssociations(disciplineId: number) {
  const rows = await contentsForDiscipline(disciplineId);
  const groups = new Map<string, {
    url: string; label: string; contentIds: number[];
    contents: { id: number; title: string; lesson: number | null }[];
  }>();
  for (const row of rows) {
    if (!row.materialUrl?.startsWith("/manus-storage/content-pdfs/")) continue;
    const current = groups.get(row.materialUrl) ?? {
      url: row.materialUrl, label: "Apostila PDF", contentIds: [], contents: [],
    };
    current.label = row.materialLabel || current.label;
    current.contentIds.push(row.id);
    current.contents.push({ id: row.id, title: row.title, lesson: lessonNumberFromContentTitle(row.title) });
    groups.set(row.materialUrl, current);
  }
  const lessonNumbers = new Set(rows.map(row => lessonNumberFromContentTitle(row.title)).filter((n): n is number => n !== null));
  const availableLessons = Array.from(lessonNumbers).sort((a, b) => a - b).map(lesson => ({
    lesson, contentCount: rows.filter(row => lessonNumberFromContentTitle(row.title) === lesson).length,
  }));
  return {
    disciplineId,
    availableLessons,
    groups: Array.from(groups.values()).map(group => ({
      ...group, contentIds: group.contentIds.sort((a, b) => a - b),
      lessons: Array.from(new Set(group.contents.map(row => row.lesson).filter((n): n is number => n !== null))).sort((a,b) => a - b),
    })),
  };
}

/** Troca uma apostila entre aulas sem reenviar o PDF, preservando alterações em outra disciplina. */
export async function moveBulkPdfAssociation(actorUserId: number, input: {
  disciplineId: number;
  sourceUrl: string;
  targetLesson: number;
  replaceExisting: boolean;
  expectedSourceContentIds: number[];
}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível.");
  if (!/^\/manus-storage\/content-pdfs\/\d+\/[a-f0-9-]{36}_[a-f0-9]{8}\.pdf$/i.test(input.sourceUrl))
    throw new Error("Apostila inválida ou não armazenada no sistema.");
  const rows = await contentsForDiscipline(input.disciplineId);
  const source = rows.filter(row => row.materialUrl === input.sourceUrl);
  const destination = rows.filter(row => lessonNumberFromContentTitle(row.title) === input.targetLesson);
  const currentIds = source.map(row => row.id).sort((a, b) => a - b);
  const expected = [...input.expectedSourceContentIds].sort((a,b) => a-b);
  if (!source.length || currentIds.join(",") !== expected.join(","))
    throw new Error("Os vínculos foram alterados. Atualize a tela de conferência.");
  if (!destination.length) throw new Error("Não existem conteúdos cadastrados nessa aula.");
  if (source.some(row => lessonNumberFromContentTitle(row.title) === null))
    throw new Error("Existem conteúdos sem identificação de aula neste PDF. Corrija-os em Conteúdos.");
  const updatedRows = Array.from(new Map([...source, ...destination].map(row => [row.id, row] as const)).values());
  // Um conteúdo pode estar vinculado a mais de uma disciplina. Nesse caso, para
  // não afetar uma disciplina não selecionada, o ajuste deve ser individual.
  const links = await db.select({ contentId: disciplineContents.contentId, disciplineId: disciplineContents.disciplineId })
    .from(disciplineContents).where(inArray(disciplineContents.contentId, updatedRows.map(row => row.id)));
  if (links.some(link => link.disciplineId !== input.disciplineId))
    throw new Error("Há conteúdos reutilizados em outra disciplina. Edite o PDF individualmente nesses conteúdos para não alterar a outra disciplina.");
  const conflicts = destination.filter(row => row.materialUrl && row.materialUrl !== input.sourceUrl);
  if (conflicts.length && !input.replaceExisting)
    throw new Error("A aula de destino já contém outra apostila. Marque a substituição para continuar.");
  const nextIds = new Set(destination.map(row => row.id));
  const operations = updatedRows.map(row => ({
    id: row.id,
    before: row.materialUrl,
    after: nextIds.has(row.id) ? input.sourceUrl : null,
  })).filter(row => row.before !== row.after);
  if (!operations.length) throw new Error("Este PDF já está associado à aula selecionada.");
  await db.transaction(async tx => {
    for (const row of operations) {
      const before = row.before === null ? isNull(contents.materialUrl) : eq(contents.materialUrl, row.before);
      const originalLabel = rows.find(item => item.materialUrl === input.sourceUrl)?.materialLabel ?? "";
      const originalName = originalLabel.replace(/^Apostila da Aula \d+\s*—\s*/i, "");
      const label = row.after
        ? (`Apostila da Aula ${String(input.targetLesson).padStart(2, "0")}` + (originalName !== originalLabel ? ` — ${originalName}` : "")).slice(0, 160)
        : null;
      const result = await tx.update(contents).set({
        materialUrl: row.after, materialLabel: label, updatedByUserId: actorUserId,
      }).where(and(eq(contents.id, row.id), before));
      if (result[0].affectedRows !== 1)
        throw new Error("Um conteúdo mudou durante a operação. Nenhuma associação foi alterada.");
      await tx.insert(contentChangelog).values({
        contentId: row.id, actorUserId, changedField: "materialUrl",
        oldValue: row.before, newValue: row.after,
      });
    }
    await tx.insert(adminAuditLogs).values({
      actorUserId, action: "REASSOCIACAO_APOSTILA_PDF",
      detail: `Disciplina ${input.disciplineId}: PDF movido para Aula ${input.targetLesson}, ${operations.length} vínculos atualizados.`,
    });
  });
  return { updated: operations.length, targetLesson: input.targetLesson };
}
