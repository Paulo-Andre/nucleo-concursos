import { and, eq, inArray } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { contents, courseDisciplines, courseEnrollments, courses, disciplineContents, disciplines, questionContentLinks, questions } from "../drizzle/schema";
import { createLocalUser, deleteManagedUser, getDb, getUserByUsername } from "./db";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";

describe("matrícula, publicação e isolamento da biblioteca", () => {
  it("não entrega conteúdo não publicado nem questão exclusiva de outro curso", async () => {
    const root = await getUserByUsername("paulo");
    const db = await getDb();
    expect(root?.role).toBe("admin");
    expect(db).toBeTruthy();
    if (!root || !db) return;

    const suffix = `qa${crypto.randomUUID().slice(0, 9).replace(/-/g, "")}`;
    const courseA = `${suffix}-a`;
    const courseB = `${suffix}-b`;
    const testUser = await createLocalUser({
      name: "Aluno QA escopo de conteúdos",
      username: suffix,
      email: `${suffix}@example.invalid`,
      cpf: null,
      passwordHash: "hash-qa-nao-utilizado",
    });
    const disciplineIds: number[] = [];
    const contentIds: number[] = [];
    const questionIds: number[] = [];

    try {
      await db.insert(courses).values([
        { id: courseA, title: "Curso de teste A", track: "QA", courseType: "concurso", isActive: true, createdByUserId: root.id },
        { id: courseB, title: "Curso de teste B", track: "QA", courseType: "concurso", isActive: true, createdByUserId: root.id },
      ]);
      const discResult = await db.insert(disciplines).values([
        { name: "Disciplina A QA", shortName: `${suffix}A`, status: "published", createdByUserId: root.id, updatedByUserId: root.id },
        { name: "Disciplina B QA", shortName: `${suffix}B`, status: "published", createdByUserId: root.id, updatedByUserId: root.id },
      ]);
      const dA = Number(discResult[0].insertId);
      const dB = dA + 1;
      disciplineIds.push(dA, dB);

      // Recuperar os IDs por chave em vez de depender da ordem das linhas do insert.
      const inserted = await db.select({ id: disciplines.id, shortName: disciplines.shortName }).from(disciplines).where(inArray(disciplines.shortName, [`${suffix}A`, `${suffix}B`]));
      const disciplineA = inserted.find(row => row.shortName === `${suffix}A`)!.id;
      const disciplineB = inserted.find(row => row.shortName === `${suffix}B`)!.id;
      disciplineIds.splice(0, disciplineIds.length, disciplineA, disciplineB);

      const publishedA = await db.insert(contents).values({ title: `${suffix}: conteúdo publicado A`, body: "Aula autorizada", status: "published", createdByUserId: root.id, updatedByUserId: root.id });
      const publishedB = await db.insert(contents).values({ title: `${suffix}: conteúdo publicado B`, body: "Não autorizado", status: "published", createdByUserId: root.id, updatedByUserId: root.id });
      const draftA = await db.insert(contents).values({ title: `${suffix}: rascunho A`, body: "Não publicado", status: "draft", createdByUserId: root.id, updatedByUserId: root.id });
      const a = Number(publishedA[0].insertId);
      const b = Number(publishedB[0].insertId);
      const draft = Number(draftA[0].insertId);
      contentIds.push(a, b, draft);

      await db.insert(courseDisciplines).values([
        { courseId: courseA, disciplineId: disciplineA, linkedByUserId: root.id },
        { courseId: courseB, disciplineId: disciplineB, linkedByUserId: root.id },
      ]);
      await db.insert(disciplineContents).values([
        { disciplineId: disciplineA, contentId: a, linkedByUserId: root.id },
        { disciplineId: disciplineA, contentId: draft, linkedByUserId: root.id },
        { disciplineId: disciplineB, contentId: b, linkedByUserId: root.id },
      ]);
      const questionA = await db.insert(questions).values({ statement: `${suffix} Questão A publicada para aluno A`, answerJson: "true", status: "published", createdByUserId: root.id, updatedByUserId: root.id });
      const questionB = await db.insert(questions).values({ statement: `${suffix} Questão B publicada apenas para aluno B`, answerJson: "false", status: "published", createdByUserId: root.id, updatedByUserId: root.id });
      const qa = Number(questionA[0].insertId);
      const qb = Number(questionB[0].insertId);
      questionIds.push(qa, qb);
      await db.insert(questionContentLinks).values([
        { questionId: qa, contentId: a, linkedByUserId: root.id },
        { questionId: qb, contentId: b, linkedByUserId: root.id },
      ]);
      await db.insert(courseEnrollments).values({
        userId: testUser.id, courseId: courseA, status: "active",
        startAt: new Date(Date.now() - 60_000), expiresAt: new Date(Date.now() + 86400000),
        createdByUserId: root.id,
      });
      const caller = appRouter.createCaller({
        user: testUser,
        req: { protocol: "https", headers: {} } as TrpcContext["req"],
        res: {} as TrpcContext["res"],
      });

      const library = await caller.study.contentProgress.get({ courseId: courseA });
      expect(library.contents.map(item => item.id)).toContain(a);
      expect(library.contents.map(item => item.id)).not.toContain(b);
      expect(library.contents.map(item => item.id)).not.toContain(draft);
      await expect(caller.study.contentProgress.open({ courseId: courseA, contentId: draft })).rejects.toThrow();
      await expect(caller.study.contentProgress.open({ courseId: courseB, contentId: b })).rejects.toThrow();

      const available = await caller.study.questions.list();
      expect(available.questions.map(item => item.id)).toContain(qa);
      expect(available.questions.map(item => item.id)).not.toContain(qb);
    } finally {
      await db.delete(questionContentLinks).where(inArray(questionContentLinks.questionId, questionIds.length ? questionIds : [-1]));
      await db.delete(questions).where(inArray(questions.id, questionIds.length ? questionIds : [-1]));
      await db.delete(disciplineContents).where(inArray(disciplineContents.contentId, contentIds.length ? contentIds : [-1]));
      await db.delete(contents).where(inArray(contents.id, contentIds.length ? contentIds : [-1]));
      await db.delete(courseDisciplines).where(inArray(courseDisciplines.courseId, [courseA, courseB]));
      await db.delete(disciplines).where(inArray(disciplines.id, disciplineIds.length ? disciplineIds : [-1]));
      await db.delete(courseEnrollments).where(and(eq(courseEnrollments.userId, testUser.id), eq(courseEnrollments.courseId, courseA)));
      await db.delete(courses).where(inArray(courses.id, [courseA, courseB]));
      await deleteManagedUser(testUser.id);
    }
  }, 30000);
});
