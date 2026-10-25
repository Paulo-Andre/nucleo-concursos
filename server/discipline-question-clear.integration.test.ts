import { and, eq, inArray, like } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  adminAuditLogs, contentChangelog, contents, courseDisciplines, disciplineContents, disciplines,
  questionChangelog, questionContentLinks, questions, reviewQueue, studyAnswers, studyReviewItems,
} from "../drizzle/schema";
import { getDb, getUserByUsername } from "./db";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

describe("exclusão de questões por disciplina", () => {
  it("exclui inclusive questões compartilhadas e utilizadas com confirmação", async () => {
    const db=await getDb();
    const root=await getUserByUsername("paulo");
    expect(root?.role).toBe("admin");
    expect(db).toBeTruthy();
    if(!db||!root)return;
    const token="qa-questoes-"+crypto.randomUUID().slice(0,8);
    const caller=appRouter.createCaller({
      user:root,req:{protocol:"https",headers:{}} as TrpcContext["req"],
      res:{} as TrpcContext["res"],
    });
    let first=0,second=0;
    const contentIds:number[]=[];
    const questionIds:number[]=[];
    try{
      const a=await caller.admin.disciplines.create({name:"Primeira "+token,shortName:"QA"+token.slice(-8),status:"draft",requiresReview:false,courseIds:[],contentIds:[]});
      const b=await caller.admin.disciplines.create({name:"Segunda "+token,shortName:"QB"+token.slice(-8),status:"draft",requiresReview:false,courseIds:[],contentIds:[]});
      first=a!.id;second=b!.id;
      const exclusive=await caller.admin.contents.create({title:"Aula exclusiva "+token,body:"Aula A",disciplineIds:[first],status:"draft",requiresReview:false});
      const shared=await caller.admin.contents.create({title:"Aula compartilhada "+token,body:"Aula A e B",disciplineIds:[first,second],status:"draft",requiresReview:false});
      contentIds.push(exclusive!.id,shared!.id);
      const createQuestion=async(suffix:string,associated:number[])=>{
        const question=await caller.admin.questions.create({
          statement:"Questão "+suffix+" de avaliação interna "+token,
          questionType:"certo_errado",answer:true,options:[],explanation:"Enunciado original de teste.",
          difficulty:"basic",source:token,banca:"QA",status:"draft",requiresReview:false,contentIds:associated,
        });
        questionIds.push(question!.id);
        return question!.id;
      };
      const removable=await createQuestion("exclusiva",[exclusive!.id]);
      const sharedId=await createQuestion("compartilhada",[shared!.id]);
      const used=await createQuestion("respondida",[exclusive!.id]);
      await db.insert(studyAnswers).values({userId:root.id,questionId:"central-"+used,correct:true});

      const preview=await caller.admin.questions.clearByDisciplineImpact({disciplineId:first});
      expect(preview).toMatchObject({total:3,removable:1,shared:1,protected:1,canClear:true});
      expect(preview.signature).toMatch(/^[a-f0-9]{64}$/);
      await expect(caller.admin.questions.clearByDiscipline({
        disciplineId:first,confirmation:"EXCLUIR TUDO",signature:preview.signature,
      })).rejects.toThrow(/confirma/i);
      await expect(caller.admin.questions.clearByDiscipline({
        disciplineId:first,confirmation:"EXCLUIR QUESTOES "+a!.shortName,signature:"a".repeat(64),
      })).rejects.toThrow(/mudou/i);

      const changed=await caller.admin.questions.clearByDiscipline({
        disciplineId:first,confirmation:"EXCLUIR QUESTOES "+a!.shortName,signature:preview.signature,
      });
      expect(changed).toMatchObject({deleted:3,preservedShared:0,preservedUsed:0});
      expect(await db.select().from(questions).where(eq(questions.id,removable))).toHaveLength(0);
      expect(await db.select().from(questionContentLinks).where(eq(questionContentLinks.questionId,removable))).toHaveLength(0);
      expect(await db.select().from(questions).where(inArray(questions.id,[sharedId,used]))).toHaveLength(0);
      expect(await db.select().from(studyAnswers).where(eq(studyAnswers.questionId,"central-"+used))).toHaveLength(0);
      expect(await db.select().from(contents).where(inArray(contents.id,contentIds))).toHaveLength(2);
      expect(await db.select().from(disciplines).where(eq(disciplines.id,first))).toHaveLength(1);
      const secondPreview=await caller.admin.questions.clearByDisciplineImpact({disciplineId:first});
      expect(secondPreview).toMatchObject({total:0,removable:0,shared:0,protected:0,canClear:false});
    }finally{
      if(questionIds.length){
        await db.delete(studyAnswers).where(inArray(studyAnswers.questionId,questionIds.flatMap(id=>[String(id),"central-"+id])));
        await db.delete(studyReviewItems).where(inArray(studyReviewItems.questionKey,questionIds.flatMap(id=>[String(id),"central-"+id])));
        await db.delete(reviewQueue).where(and(eq(reviewQueue.itemType,"question"),inArray(reviewQueue.itemId,questionIds)));
        await db.delete(questionContentLinks).where(inArray(questionContentLinks.questionId,questionIds));
        await db.delete(questionChangelog).where(inArray(questionChangelog.questionId,questionIds));
        await db.delete(questions).where(inArray(questions.id,questionIds));
      }
      if(contentIds.length){
        await db.delete(reviewQueue).where(and(eq(reviewQueue.itemType,"content"),inArray(reviewQueue.itemId,contentIds)));
        await db.delete(disciplineContents).where(inArray(disciplineContents.contentId,contentIds));
        await db.delete(contentChangelog).where(inArray(contentChangelog.contentId,contentIds));
        await db.delete(contents).where(inArray(contents.id,contentIds));
      }
      for(const disciplineId of [first,second].filter(Boolean)){
        await db.delete(courseDisciplines).where(eq(courseDisciplines.disciplineId,disciplineId));
        await db.delete(disciplineContents).where(eq(disciplineContents.disciplineId,disciplineId));
        await db.delete(disciplines).where(eq(disciplines.id,disciplineId));
      }
      await db.delete(adminAuditLogs).where(and(eq(adminAuditLogs.actorUserId,root.id),like(adminAuditLogs.detail,"%"+token+"%")));
    }
  },45000);
});
