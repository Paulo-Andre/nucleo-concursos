import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import {
  adminAuditLogs, contentChangelog, contents, disciplineContents, disciplines,
  questionContentLinks, reviewQueue, studyContentProgress, studyRoadmapItems,
} from "../drizzle/schema";
import { getDb } from "./db";

export type BulkContentCleanupMode = "unlink" | "delete_exclusive";
const MAX_LINKED = 5000;

/**
 * Protege aulas utilizadas por alunos e materiais compartilhados.
 * "unlink": retira todos os vínculos desta disciplina, mantém os conteúdos no banco.
 * "delete_exclusive": retira os vínculos desta disciplina e apaga somente conteúdos que
 * não pertençam a nenhuma outra disciplina. Questões são preservadas.
 */
async function inspectWithin(transaction: any, disciplineId: number) {
  const discipline = (await transaction.select({id:disciplines.id,name:disciplines.name,shortName:disciplines.shortName})
    .from(disciplines).where(eq(disciplines.id,disciplineId)).limit(1))[0];
  if(!discipline)throw new Error("Disciplina não encontrada.");
  const links: { contentId: number }[] = await transaction.select({contentId:disciplineContents.contentId})
    .from(disciplineContents).where(eq(disciplineContents.disciplineId,disciplineId));
  if(links.length>MAX_LINKED)throw new Error(`Esta disciplina possui mais de ${MAX_LINKED} conteúdos. Faça a limpeza em lotes menores.`);
  const ids=Array.from(new Set(links.map(link=>link.contentId))).sort((a,b)=>a-b);
  if(!ids.length) return {discipline,ids,exclusiveIds:[] as number[],sharedIds:[] as number[],
    progress:[] as {contentId:number}[],roadmaps:[] as {contentId:number}[],questionLinks:[] as {contentId:number}[],
    previewToken:createHash("sha256").update(`${disciplineId}:empty`).digest("hex")};
  const [allLinks,progress,roadmaps,questionLinks,contentDetails]=await Promise.all([
    transaction.select({contentId:disciplineContents.contentId,disciplineId:disciplineContents.disciplineId})
      .from(disciplineContents).where(inArray(disciplineContents.contentId,ids)),
    transaction.select({contentId:studyContentProgress.contentId})
      .from(studyContentProgress).where(inArray(studyContentProgress.contentId,ids)),
    transaction.select({contentId:studyRoadmapItems.contentId})
      .from(studyRoadmapItems).where(inArray(studyRoadmapItems.contentId,ids)),
    transaction.select({contentId:questionContentLinks.contentId})
      .from(questionContentLinks).where(inArray(questionContentLinks.contentId,ids)),
    transaction.select({id:contents.id,title:contents.title,updatedAt:contents.updatedAt})
      .from(contents).where(inArray(contents.id,ids)),
  ]);
  if(contentDetails.length!==ids.length)throw new Error("Existem vínculos com conteúdos inexistentes. Faça a auditoria do banco.");
  const sharedIds=ids.filter(id=>allLinks.some((link:{contentId:number;disciplineId:number})=>link.contentId===id&&link.disciplineId!==disciplineId));
  const sharedSet=new Set(sharedIds);
  const exclusiveIds=ids.filter(id=>!sharedSet.has(id));
  const signature=ids.map(id=>{
    const c=contentDetails.find((row:{id:number})=>row.id===id)!;
    return [id,c.title,c.updatedAt?.toISOString(),sharedSet.has(id)?1:0,
      progress.filter((p:{contentId:number})=>p.contentId===id).length,
      roadmaps.filter((p:{contentId:number})=>p.contentId===id).length].join("|");
  });
  const previewToken=createHash("sha256").update(JSON.stringify([disciplineId,signature])).digest("hex");
  return {discipline,ids,exclusiveIds,sharedIds,progress,roadmaps,questionLinks,previewToken};
}
export async function previewDisciplineContentCleanup(disciplineId:number) {
  const db=await getDb();if(!db)throw new Error("Banco de dados indisponível.");
  const plan=await inspectWithin(db,disciplineId);
  const protectedIds=Array.from(new Set([...plan.progress,...plan.roadmaps].map(row=>row.contentId)));
  return {disciplineId,disciplineName:plan.discipline.name,shortName:plan.discipline.shortName,
    total:plan.ids.length,exclusive:plan.exclusiveIds.length,shared:plan.sharedIds.length,
    protectedCount:protectedIds.length,studentProgress:plan.progress.length,studentRoadmaps:plan.roadmaps.length,
    linkedQuestions:plan.questionLinks.length,canExecute:!protectedIds.length&&plan.ids.length>0,
    previewToken:plan.previewToken};
}
export async function cleanupDisciplineContents(actorUserId:number,input:{
  disciplineId:number;mode:BulkContentCleanupMode;confirmation:string;previewToken:string;
}) {
  const db=await getDb();if(!db)throw new Error("Banco de dados indisponível.");
  if(!["unlink","delete_exclusive"].includes(input.mode))throw new Error("Modo de limpeza inválido.");
  return db.transaction(async tx=>{
    const plan=await inspectWithin(tx,input.disciplineId);
    const required=`LIMPAR ${plan.discipline.shortName}`;
    if(input.confirmation!==required)throw new Error(`Para confirmar, digite exatamente: ${required}`);
    if(input.previewToken!==plan.previewToken)throw new Error("Os vínculos mudaram desde a prévia. Faça uma nova conferência.");
    if(!plan.ids.length)throw new Error("Esta disciplina não possui conteúdos vinculados.");
    if(plan.progress.length||plan.roadmaps.length)
      throw new Error("Há conteúdos em uso por alunos. Para proteger o progresso, desative a disciplina ou revise os vínculos primeiro.");
    let removedQuestionsLinks=0;
    if(input.mode==="delete_exclusive"&&plan.exclusiveIds.length){
      const exclusive=plan.exclusiveIds;
      removedQuestionsLinks=plan.questionLinks.filter(row=>exclusive.includes(row.contentId)).length;
      await tx.delete(questionContentLinks).where(inArray(questionContentLinks.contentId,exclusive));
      await tx.delete(reviewQueue).where(and(eq(reviewQueue.itemType,"content"),inArray(reviewQueue.itemId,exclusive)));
      await tx.delete(contentChangelog).where(inArray(contentChangelog.contentId,exclusive));
    }
    // Primeiro remova o vínculo selecionado, sem alterar materiais de outras disciplinas.
    await tx.delete(disciplineContents).where(eq(disciplineContents.disciplineId,input.disciplineId));
    if(input.mode==="delete_exclusive"&&plan.exclusiveIds.length)
      await tx.delete(contents).where(inArray(contents.id,plan.exclusiveIds));
    await tx.insert(adminAuditLogs).values({actorUserId,action:"LIMPEZA_CONTEUDOS_DISCIPLINA",
      detail:`Disciplina #${input.disciplineId} (${plan.discipline.name}): modo ${input.mode}; ${plan.ids.length} vínculos removidos; ${input.mode==="delete_exclusive"?plan.exclusiveIds.length:0} conteúdos exclusivos apagados; ${plan.sharedIds.length} compartilhados preservados; ${removedQuestionsLinks} vínculos de questões removidos (questões mantidas).`});
    return {removedLinks:plan.ids.length,deletedContents:input.mode==="delete_exclusive"?plan.exclusiveIds.length:0,
      preservedSharedContents:plan.sharedIds.length,removedQuestionLinks:removedQuestionsLinks};
  });
}
