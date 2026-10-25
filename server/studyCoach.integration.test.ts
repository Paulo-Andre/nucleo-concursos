import { describe, expect, it } from "vitest";
import { courseEnrollments, studyAnswers } from "../drizzle/schema";
import { eq } from "drizzle-orm";
import { createLocalUser, deleteManagedUser, getDb, getUserByUsername, getStudyCourseProgress, listStudyQuestions, saveStudyReviewItem, listStudyReviewItems } from "./db";
import { createFlashcard, rateFlashcard, removeFlashcard, listFlashcards, getLearningDiagnostic, listErrorNotebook, classifyStudyError, rateQuestionReview } from "./studyCoach";

describe("jornada pedagógica no banco MySQL",()=>{
 it("isola cartões, agenda recuperação ativa e personaliza o diagnóstico",async()=>{
  const db=await getDb(); const root=await getUserByUsername("paulo");
  expect(db).toBeTruthy();expect(root?.role).toBe("admin");
  if(!db||!root)return;
  const token=crypto.randomUUID().slice(0,8);
  const student=await createLocalUser({name:"Aluno QA método",username:"metodo"+token,email:`metodo${token}@example.invalid`,cpf:null,passwordHash:"qa-fake-not-used"});
  const peer=await createLocalUser({name:"Aluno QA isolado",username:"outro"+token,email:`outro${token}@example.invalid`,cpf:null,passwordHash:"qa-fake-not-used"});
  try{
   const now=new Date();
   await db.insert(courseEnrollments).values([
    {userId:student.id,courseId:"pf-agente",startAt:new Date(now.getTime()-60000),expiresAt:new Date(now.getTime()+86400000),status:"active",createdByUserId:root.id},
    {userId:peer.id,courseId:"pf-agente",startAt:new Date(now.getTime()-60000),expiresAt:new Date(now.getTime()+86400000),status:"active",createdByUserId:root.id},
   ]);
   const course=await getStudyCourseProgress(student.id,"pf-agente");
   expect(course.contents.length).toBeGreaterThan(0);
   const contentId=course.contents[0].id;
   const card=await createFlashcard(student.id,{courseId:"pf-agente",contentId,front:"O que memorizar?",back:"Resposta de teste."});
   expect(card.length).toBe(1);
   expect((await listFlashcards(peer.id,"pf-agente"))).toHaveLength(0);
   const reviewed=await rateFlashcard(student.id,{courseId:"pf-agente",id:card[0].id,rating:"good"});
   expect(reviewed[0].schedule.intervalDays).toBe(1);
   expect(reviewed[0].due).toBe(false);
   await expect(rateFlashcard(peer.id,{courseId:"pf-agente",id:card[0].id,rating:"easy"})).rejects.toThrow();
   const overview=await getLearningDiagnostic(student.id,"pf-agente",false,20);
   expect(overview).toMatchObject({minutes:20,courseId:"pf-agente",flashcardCount:1});
   await removeFlashcard(student.id,{courseId:"pf-agente",id:card[0].id});
   expect(await listFlashcards(student.id,"pf-agente")).toHaveLength(0);

   const bank=(await listStudyQuestions(student.id)).questions;
   expect(bank.length).toBeGreaterThan(0);
   const item=bank[0];
   await db.insert(studyAnswers).values({userId:student.id,questionId:`central-${item.id}`,correct:false});
   const errors=await listErrorNotebook(student.id,"pf-agente");
   expect(errors.map(x=>x.questionId)).toContain(`central-${item.id}`);
   const classified=await classifyStudyError(student.id,{courseId:"pf-agente",questionId:`central-${item.id}`,reason:"interpretacao",observation:"Preciso ler a questão integralmente."});
   expect(classified.find(x=>x.questionId===`central-${item.id}`)?.reason).toBe("interpretacao");

   const created=await saveStudyReviewItem(student.id,{questionKey:"qa-"+token,snapshot:{
    statement:"Uma afirmação de teste para minha revisão espaçada.",answer:true,explanation:"Fundamento de QA.",discipline:"Português",subject:"Leitura",
   }});
   const own=created.find(x=>x.questionKey==="qa-"+token);
   expect(own).toBeTruthy();
   if(own){
    const next=await rateQuestionReview(student.id,own.id,"good");
    expect(next.intervalDays).toBe(1);
    const listed=await listStudyReviewItems(student.id);
    expect(listed.find(x=>x.id===own.id)?.due).toBe(false);
   }
  }finally{
   await db.delete(studyAnswers).where(eq(studyAnswers.userId,student.id));
   await deleteManagedUser(student.id);
   await deleteManagedUser(peer.id);
  }
 },30000);
});
