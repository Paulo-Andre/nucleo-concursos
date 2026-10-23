import { and, eq, like } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
 adminAuditLogs, contentChangelog, contents, courseDisciplines, disciplineContents, disciplines,
 questionChangelog, questionContentLinks, questions, studyContentProgress, studyRoadmapItems,
} from "../drizzle/schema";
import { getDb, getUserByUsername } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

describe("excluir todos os conteúdos de uma disciplina",()=>{
 it("exclui aulas exclusivas, desvincula compartilhadas e conserva questões; bloqueia progresso e totais divergentes",async()=>{
  const db=await getDb();const root=await getUserByUsername("paulo");
  expect(db).toBeTruthy();expect(root?.role).toBe("admin");
  if(!db||!root)return;
  const token="qa-limpeza-"+crypto.randomUUID().slice(0,8);
  const caller=appRouter.createCaller({
   user:root,
   req:{protocol:"https",headers:{}} as TrpcContext["req"],
   res:{} as TrpcContext["res"],
  });
  let a=0,b=0,exclusive=0,shared=0,q=0;
  try{
   const first=await caller.admin.disciplines.create({
    name:"Primeira "+token,shortName:"A"+token.slice(-7).toUpperCase(),status:"draft",
    description:"",requiresReview:false,courseIds:[],contentIds:[],
   });
   const second=await caller.admin.disciplines.create({
    name:"Segunda "+token,shortName:"B"+token.slice(-7).toUpperCase(),status:"draft",
    description:"",requiresReview:false,courseIds:[],contentIds:[],
   });
   a=first!.id;b=second!.id;
   const firstContent=await caller.admin.contents.create({
    title:"Exclusiva "+token,body:"Teoria",disciplineIds:[a],status:"draft",requiresReview:false,
   });
   const sharedContent=await caller.admin.contents.create({
    title:"Compartilhada "+token,body:"Teoria",disciplineIds:[a,b],status:"draft",requiresReview:false,
   });
   exclusive=firstContent!.id;shared=sharedContent!.id;
   const question=await caller.admin.questions.create({
    statement:"Questão original usada para testar a limpeza de conteúdos "+token,
    questionType:"certo_errado",answer:true,options:[],explanation:"Gabarito.",
    difficulty:"basic",source:token,banca:"QA",status:"draft",requiresReview:false,contentIds:[exclusive,shared],
   });
   q=question!.id;
   const preview=await caller.admin.disciplines.clearContentsImpact({id:a});
   expect(preview).toMatchObject({total:2,exclusive:1,shared:1,protected:0,questionLinks:1,canClear:true});
   await expect(caller.admin.disciplines.clearContents({
    id:a,confirmation:"NÃO CONFIRMADO",expectedTotal:2,expectedExclusive:1,expectedShared:1,
   })).rejects.toThrow(/confirma/i);
   await expect(caller.admin.disciplines.clearContents({
    id:a,confirmation:"ESVAZIAR "+first!.shortName,expectedTotal:999,expectedExclusive:1,expectedShared:1,
   })).rejects.toThrow(/mudaram/i);

   const progress=await db.insert(studyContentProgress).values({
    userId:root.id,courseId:token,contentId:exclusive,status:"started",
   });
   try{
    expect(await caller.admin.disciplines.clearContentsImpact({id:a})).toMatchObject({canClear:true,protected:1,progressToDelete:1});
    await expect(caller.admin.disciplines.clearContents({
     id:a,confirmation:"ESVAZIAR "+first!.shortName,expectedTotal:2,expectedExclusive:1,expectedShared:1,
    })).rejects.toThrow(/alunos/i);
    expect(await db.select().from(contents).where(eq(contents.id,exclusive))).toHaveLength(1);
   }finally{
    await db.delete(studyContentProgress).where(eq(studyContentProgress.id,Number(progress[0].insertId)));
   }
   const result=await caller.admin.disciplines.clearContents({
    id:a,confirmation:"ESVAZIAR "+first!.shortName,expectedTotal:2,expectedExclusive:1,expectedShared:1,
   });
   expect(result).toMatchObject({total:2,deleted:1,unlinkedShared:1,unlinkedQuestions:1});
   expect(await db.select().from(contents).where(eq(contents.id,exclusive))).toHaveLength(0);
   expect(await db.select().from(contents).where(eq(contents.id,shared))).toHaveLength(1);
   expect(await db.select().from(disciplines).where(eq(disciplines.id,a))).toHaveLength(1);
   expect(await db.select().from(disciplineContents).where(eq(disciplineContents.disciplineId,a))).toHaveLength(0);
   expect((await db.select().from(disciplineContents).where(eq(disciplineContents.contentId,shared))).map(x=>x.disciplineId)).toEqual([b]);
   expect((await db.select().from(questionContentLinks).where(eq(questionContentLinks.questionId,q))).map(x=>x.contentId)).toEqual([shared]);
   expect(await db.select().from(questions).where(eq(questions.id,q))).toHaveLength(1);
  }finally{
   if(q){
    await db.delete(questionContentLinks).where(eq(questionContentLinks.questionId,q));
    await db.delete(questionChangelog).where(eq(questionChangelog.questionId,q));
    await db.delete(questions).where(eq(questions.id,q));
   }
   for(const id of [exclusive,shared].filter(Boolean)){
    await db.delete(questionContentLinks).where(eq(questionContentLinks.contentId,id));
    await db.delete(studyContentProgress).where(eq(studyContentProgress.contentId,id));
    await db.delete(studyRoadmapItems).where(eq(studyRoadmapItems.contentId,id));
    await db.delete(disciplineContents).where(eq(disciplineContents.contentId,id));
    await db.delete(contentChangelog).where(eq(contentChangelog.contentId,id));
    await db.delete(contents).where(eq(contents.id,id));
   }
   for(const id of [a,b].filter(Boolean)){
    await db.delete(disciplineContents).where(eq(disciplineContents.disciplineId,id));
    await db.delete(courseDisciplines).where(eq(courseDisciplines.disciplineId,id));
    await db.delete(disciplines).where(eq(disciplines.id,id));
   }
   await db.delete(adminAuditLogs).where(and(eq(adminAuditLogs.actorUserId,root.id),like(adminAuditLogs.detail,"%"+token+"%")));
  }
 },45000);
});
