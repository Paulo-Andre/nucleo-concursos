import { createHash } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import {
  adminAuditLogs, competitionAnswers, competitionRounds, courseDisciplines, disciplineContents, disciplines,
  questionChangelog, questionContentLinks, questions, reviewQueue, simulationQuestions,
  studyAnswers, studyReviewItems,
} from "../drizzle/schema";
import { getDb } from "./db";

/** O banco não tem uma coluna disciplinaId na questão: a disciplina é deduzida
 * exclusivamente de questionContentLinks -> disciplineContents.
 * Questões reutilizadas em outras disciplinas jamais são apagadas em lote.
 */
type Store = any;
const chunks = <T,>(values:T[],size=500) =>
  Array.from({length:Math.ceil(values.length/size)},(_,i)=>values.slice(i*size,(i+1)*size));
async function selected<T>(values:T[],fetch:(batch:T[])=>Promise<any[]>):Promise<any[]> {
  const results:any[]=[];
  for(const batch of chunks(values)) results.push(...await fetch(batch));
  return results;
}
function hasQuestionId(value:unknown,ids:Set<number>,depth=0):number[] {
  if(depth>6)return [];
  if(typeof value==="number"&&ids.has(value))return [value];
  if(typeof value==="string"&&/^\d+$/.test(value)&&ids.has(Number(value)))return [Number(value)];
  if(Array.isArray(value))return value.flatMap(item=>hasQuestionId(item,ids,depth+1));
  if(value&&typeof value==="object")return Object.values(value).flatMap(item=>hasQuestionId(item,ids,depth+1));
  return [];
}

/** Verifica o histórico, inclusive checagem diária, revisões pessoais, simulados e competições. */
export async function getUsedCentralQuestionIds(store:Store,questionIds:number[]) {
  const used=new Set<number>();
  if(!questionIds.length)return used;
  for(const batch of chunks(questionIds)){
    const keys=batch.flatMap(id=>[String(id),"central-"+id]);
    const [answers,reviews,simulations,competitions]=await Promise.all([
      store.select({questionId:studyAnswers.questionId}).from(studyAnswers).where(inArray(studyAnswers.questionId,keys)),
      store.select({questionKey:studyReviewItems.questionKey}).from(studyReviewItems).where(inArray(studyReviewItems.questionKey,keys)),
      store.select({questionId:simulationQuestions.questionId}).from(simulationQuestions).where(inArray(simulationQuestions.questionId,batch)),
      store.select({questionId:competitionAnswers.questionId}).from(competitionAnswers).where(inArray(competitionAnswers.questionId,batch)),
    ]);
    for(const row of answers)used.add(Number(String(row.questionId).replace(/^central-/,"")));
    for(const row of reviews)used.add(Number(String(row.questionKey).replace(/^central-/,"")));
    for(const row of simulations)used.add(row.questionId);
    for(const row of competitions)used.add(row.questionId);
  }
  // Rodadas ainda não respondidas também devem continuar referenciando questões válidas.
  const rounds=await store.select({questionIdsJson:competitionRounds.questionIdsJson}).from(competitionRounds);
  const expected=new Set(questionIds);
  for(const round of rounds){
    try {
      for(const questionId of hasQuestionId(JSON.parse(round.questionIdsJson),expected))used.add(questionId);
    }catch{
      // JSON inconsistente: recusar remoções até auditoria para evitar histórico órfão.
      questionIds.forEach(id=>used.add(id));
    }
  }
  return used;
}

async function analyze(store:Store,disciplineId:number) {
  const discipline=(await store.select({
    id:disciplines.id,name:disciplines.name,shortName:disciplines.shortName,
  }).from(disciplines).where(eq(disciplines.id,disciplineId)).limit(1))[0];
  if(!discipline)throw new Error("Disciplina não encontrada.");
  const linkedCourses=await store.select({courseId:courseDisciplines.courseId})
    .from(courseDisciplines).where(eq(courseDisciplines.disciplineId,disciplineId));
  const courseCount=linkedCourses.length;
  const contentRows=await store.select({contentId:disciplineContents.contentId})
    .from(disciplineContents).where(eq(disciplineContents.disciplineId,disciplineId));
  const contentIds=Array.from(new Set<number>(contentRows.map((row:any)=>row.contentId)));
  const candidateLinks=await selected(contentIds,(batch)=>store.select({
    questionId:questionContentLinks.questionId,contentId:questionContentLinks.contentId,
  }).from(questionContentLinks).where(inArray(questionContentLinks.contentId,batch)));
  const candidateIds=Array.from(new Set<number>(candidateLinks.map((row:any)=>row.questionId))).sort((a,b)=>a-b);
  if(!candidateIds.length){
    return {...discipline,courseCount,total:0,removable:0,shared:0,protected:0,canClear:false,
      signature:"none",eligibleIds:[] as number[],protectedIds:[] as number[],sharedIds:[] as number[]};
  }
  const linked=await selected(candidateIds,(batch)=>store.select({
    questionId:questionContentLinks.questionId,contentId:questionContentLinks.contentId,
  }).from(questionContentLinks).where(inArray(questionContentLinks.questionId,batch)));
  const linkedContents=Array.from(new Set<number>(linked.map((row:any)=>row.contentId)));
  const disciplinesForContents=await selected(linkedContents,(batch)=>store.select({
    contentId:disciplineContents.contentId,disciplineId:disciplineContents.disciplineId,
  }).from(disciplineContents).where(inArray(disciplineContents.contentId,batch)));
  const disciplinesByContent=new Map<number,Set<number>>();
  for(const link of disciplinesForContents){
    if(!disciplinesByContent.has(link.contentId))disciplinesByContent.set(link.contentId,new Set());
    disciplinesByContent.get(link.contentId)!.add(link.disciplineId);
  }
  const linksByQuestion=new Map<number,number[]>();
  for(const link of linked){
    linksByQuestion.set(link.questionId,[...(linksByQuestion.get(link.questionId)??[]),link.contentId]);
  }
  const used=await getUsedCentralQuestionIds(store,candidateIds);
  const protectedIds:number[]=[];
  const sharedIds:number[]=[];
  const eligibleIds:number[]=[];
  for(const id of candidateIds){
    if(used.has(id)){protectedIds.push(id);continue;}
    const linkedIds=linksByQuestion.get(id)??[];
    if(!linkedIds.length||linkedIds.some(contentId=>{
      const memberships=disciplinesByContent.get(contentId);
      return !memberships||memberships.size!==1||!memberships.has(disciplineId);
    })){sharedIds.push(id);continue;}
    eligibleIds.push(id);
  }
  const signature=createHash("sha256").update(JSON.stringify({
    disciplineId,candidateIds,eligibleIds,protectedIds,sharedIds,
    linked:linked.slice().sort((a:any,b:any)=>a.questionId-b.questionId||a.contentId-b.contentId),
    memberships:disciplinesForContents.slice().sort((a:any,b:any)=>a.contentId-b.contentId||a.disciplineId-b.disciplineId),
  })).digest("hex");
  return {...discipline,courseCount,total:candidateIds.length,removable:eligibleIds.length,
    shared:sharedIds.length,protected:protectedIds.length,
    canClear:eligibleIds.length>0,signature,eligibleIds,protectedIds,sharedIds};
}

export async function getManagedDisciplineQuestionsClearImpact(disciplineId:number) {
  const db=await getDb();
  if(!db)throw new Error("Banco indisponível.");
  const {eligibleIds,protectedIds,sharedIds,...impact}=await analyze(db,disciplineId);
  return impact;
}

/** Exclui definitivamente apenas questões exclusivas não usadas. Restantes são preservadas.
 * Prévia, confirmação e contagens são revalidadas no início da transação.
 */
export async function clearManagedDisciplineQuestions(
  actorUserId:number,disciplineId:number,confirmation:string,signature:string,
) {
  const db=await getDb();
  if(!db)throw new Error("Banco indisponível.");
  return db.transaction(async tx=>{
    const inspection=await analyze(tx,disciplineId);
    if(confirmation!=="EXCLUIR QUESTOES "+inspection.shortName)
      throw new Error("Digite exatamente a confirmação exibida na tela.");
    if(inspection.signature!==signature)
      throw new Error("O banco mudou desde a prévia. Abra a análise novamente antes de excluir.");
    if(!inspection.eligibleIds.length)
      throw new Error("Não existem questões exclusivas sem uso que possam ser excluídas.");
    const deletableIds: number[] = inspection.eligibleIds.map((id: number) => id);
    for(const ids of chunks<number>(deletableIds)){
      await tx.delete(reviewQueue).where(and(eq(reviewQueue.itemType,"question"),inArray(reviewQueue.itemId,ids)));
      await tx.delete(questionChangelog).where(inArray(questionChangelog.questionId,ids));
      await tx.delete(questionContentLinks).where(inArray(questionContentLinks.questionId,ids));
      await tx.delete(questions).where(inArray(questions.id,ids));
    }
    await tx.insert(adminAuditLogs).values({
      actorUserId,action:"EXCLUSAO_QUESTOES_DISCIPLINA",
      detail:"Disciplina "+inspection.shortName+" (#"+disciplineId+"): "+inspection.eligibleIds.length+
        " questões exclusivas sem uso excluídas; "+inspection.sharedIds.length+
        " compartilhadas e "+inspection.protectedIds.length+
        " utilizadas por alunos preservadas. Exclusão confirmada pelo administrador.",
    });
    return {id:disciplineId,deleted:inspection.eligibleIds.length,
      preservedShared:inspection.sharedIds.length,preservedUsed:inspection.protectedIds.length};
  });
}
