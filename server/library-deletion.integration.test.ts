import { and, eq, like } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import {
  adminAuditLogs, contentChangelog, contents, disciplineContents, disciplines,
  questionChangelog, questionContentLinks, questions, studyContentProgress, studyRoadmapItems,
} from "../drizzle/schema";
import type { TrpcContext } from "./_core/context";
import { getDb, getUserByUsername } from "./db";
import { appRouter } from "./routers";

describe("exclusão segura de conteúdos e disciplinas na biblioteca ROOT", () => {
  it("exige confirmação, bloqueia conteúdo com progresso e preserva questões e conteúdos compartilhados", async () => {
    const root = await getUserByUsername("paulo");
    const db = await getDb();
    expect(root?.role).toBe("admin");
    expect(db).toBeTruthy();
    if (!root || !db) return;
    const token = `library-delete-${crypto.randomUUID().slice(0,8)}`;
    const name = `Disciplina ${token}`;
    const shortName = `LD${token.slice(-8)}`.toUpperCase();
    const title = `Aula temporária ${token}`;
    const caller = appRouter.createCaller({
      user: root, req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });
    let disciplineId = 0;
    let contentId = 0;
    let questionId = 0;
    try {
      const discipline = await caller.admin.disciplines.create({
        name,shortName,description:"Disciplina teste",status:"draft",requiresReview:false,courseIds:[],contentIds:[],
      });
      disciplineId = discipline!.id;
      const content = await caller.admin.contents.create({
        title,objective:"Objetivo teste",description:"Teste de exclusão segura",body:"Conteúdo temporário",
        disciplineIds:[disciplineId],status:"draft",requiresReview:false,
      });
      contentId = content!.id;
      const question = await caller.admin.questions.create({
        statement:`Questão temporária ${token}, que deve sobreviver à remoção da aula.`,
        questionType:"certo_errado",options:[],answer:true,explanation:"Preservar questão.",
        difficulty:"basic",source:token,banca:"Teste",year:2026,status:"draft",
        requiresReview:false,contentIds:[contentId],
      });
      questionId = question!.id;
      expect((await caller.admin.contents.deletionImpact({id:contentId}))).toMatchObject({
        canDelete:true,disciplineLinks:1,questionLinks:1,studentProgress:0,
      });
      await expect(caller.admin.contents.remove({id:contentId,confirmation:"ERRO"})).rejects.toThrow();
      const fakeCourseId = `temporary-${token}`;
      const progress = await db.insert(studyContentProgress).values({userId:root.id,courseId:fakeCourseId,contentId,status:"started"});
      const progressId = Number(progress[0].insertId);
      try {
        expect((await caller.admin.contents.deletionImpact({id:contentId})).canDelete).toBe(false);
        await expect(caller.admin.contents.remove({id:contentId,confirmation:title})).rejects.toThrow(/progresso/i);
        expect((await db.select().from(contents).where(eq(contents.id,contentId)))).toHaveLength(1);
      } finally {
        await db.delete(studyContentProgress).where(eq(studyContentProgress.id,progressId));
      }
      await expect(caller.admin.contents.remove({id:contentId,confirmation:title})).resolves.toMatchObject({id:contentId,removedQuestionLinks:1});
      expect(await db.select().from(contents).where(eq(contents.id,contentId))).toHaveLength(0);
      expect(await db.select().from(questionContentLinks).where(eq(questionContentLinks.contentId,contentId))).toHaveLength(0);
      expect(await db.select().from(disciplineContents).where(eq(disciplineContents.contentId,contentId))).toHaveLength(0);
      expect(await db.select().from(questions).where(eq(questions.id,questionId))).toHaveLength(1);
      contentId = 0;

      const preservedContent = await caller.admin.contents.create({
        title:`Aula preservada ${token}`,disciplineIds:[disciplineId],status:"draft",requiresReview:false,
      });
      contentId = preservedContent!.id;
      expect((await caller.admin.disciplines.deletionImpact({id:disciplineId}))).toMatchObject({
        canDelete:true,contentLinks:1,
      });
      await expect(caller.admin.disciplines.remove({id:disciplineId,confirmation:"ERRO"})).rejects.toThrow();
      // Uma disciplina utilizada no roteiro de um aluno não pode desaparecer da matriz.
      const roadmap = await db.insert(studyRoadmapItems).values({
        userId:root.id,courseId:fakeCourseId,contentId,disciplineId,weekday:1,startTime:"08:00",isActive:true,
      });
      const roadmapId = Number(roadmap[0].insertId);
      try {
        expect((await caller.admin.disciplines.deletionImpact({id:disciplineId})).canDelete).toBe(false);
        await expect(caller.admin.disciplines.remove({id:disciplineId,confirmation:shortName})).rejects.toThrow(/roteiro/i);
      } finally {
        await db.delete(studyRoadmapItems).where(eq(studyRoadmapItems.id,roadmapId));
      }
      await caller.admin.disciplines.remove({id:disciplineId,confirmation:shortName});
      expect(await db.select().from(disciplines).where(eq(disciplines.id,disciplineId))).toHaveLength(0);
      expect(await db.select().from(disciplineContents).where(eq(disciplineContents.disciplineId,disciplineId))).toHaveLength(0);
      expect(await db.select().from(contents).where(eq(contents.id,contentId))).toHaveLength(1);
      disciplineId = 0;
      expect((await db.select().from(adminAuditLogs).where(and(
        eq(adminAuditLogs.actorUserId,root.id),like(adminAuditLogs.detail,`%${token}%`)
      ))).length).toBeGreaterThan(0);
    } finally {
      if (questionId) {
        await db.delete(questionContentLinks).where(eq(questionContentLinks.questionId,questionId));
        await db.delete(questionChangelog).where(eq(questionChangelog.questionId,questionId));
        await db.delete(questions).where(eq(questions.id,questionId));
      }
      if (contentId) {
        await db.delete(studyContentProgress).where(eq(studyContentProgress.contentId,contentId));
        await db.delete(studyRoadmapItems).where(eq(studyRoadmapItems.contentId,contentId));
        await db.delete(disciplineContents).where(eq(disciplineContents.contentId,contentId));
        await db.delete(contentChangelog).where(eq(contentChangelog.contentId,contentId));
        await db.delete(contents).where(eq(contents.id,contentId));
      }
      if (disciplineId) {
        await db.delete(disciplineContents).where(eq(disciplineContents.disciplineId,disciplineId));
        await db.delete(disciplines).where(eq(disciplines.id,disciplineId));
      }
      await db.delete(adminAuditLogs).where(and(eq(adminAuditLogs.actorUserId,root.id),like(adminAuditLogs.detail,`%${token}%`)));
    }
  },45000);
});
