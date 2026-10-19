import { and, desc, eq, like, inArray } from "drizzle-orm";
import { studyNotes, studyReviewItems, studyAnswers } from "../drizzle/schema";
import { getDb, getStudyCourseProgress, getUserCourseAccess, listStudyQuestions } from "./db";
import { questionBank } from "../client/src/data/pfStudyData";
import { initialReviewSchedule, isReviewDue, scheduleReview, type ReviewRating, type ReviewSchedule } from "../shared/spacedRepetition";

type FlashcardRecord = {
  courseId: string; contentId: number; front: string; back: string;
  schedule: ReviewSchedule; createdAt: string;
};
const CARD_PREFIX = "fc:";
const ERROR_PREFIX = "error:";
const safeJson = (raw: string): unknown => { try { return JSON.parse(raw); } catch { return null; } };
function isRecord(x: unknown): x is Record<string, unknown> { return typeof x === "object" && x !== null && !Array.isArray(x); }
async function assertCourse(userId: number, courseId: string, isAdmin: boolean) {
  if (isAdmin) return;
  const enrollments = await getUserCourseAccess(userId);
  if (!enrollments.some(item => item.courseId === courseId)) throw new Error("É necessária matrícula vigente neste curso.");
}
async function scopedContents(userId: number, courseId: string, isAdmin: boolean) {
  await assertCourse(userId, courseId, isAdmin);
  return (await getStudyCourseProgress(userId, courseId, isAdmin)).contents;
}
function parseCard(raw: string): FlashcardRecord | null {
  const value = safeJson(raw);
  if (!isRecord(value) || typeof value.courseId !== "string" || typeof value.front !== "string"
    || typeof value.back !== "string" || typeof value.contentId !== "number" || !isRecord(value.schedule)
    || typeof value.schedule.dueAt !== "string" || typeof value.schedule.intervalDays !== "number"
    || typeof value.schedule.repetitions !== "number" || typeof value.schedule.ease !== "number") return null;
  return value as FlashcardRecord;
}
export async function listFlashcards(userId: number, courseId: string, isAdmin = false) {
  const contents = await scopedContents(userId, courseId, isAdmin);
  const allowed = new Set(contents.map(item => item.id));
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  const rows = await db.select().from(studyNotes).where(and(eq(studyNotes.userId, userId), like(studyNotes.moduleId, "fc:%"))).orderBy(desc(studyNotes.updatedAt));
  return rows.flatMap(row => {
    const card = parseCard(row.content);
    if (!card || card.courseId !== courseId || !allowed.has(card.contentId)) return [];
    return [{ id: row.moduleId.slice(CARD_PREFIX.length), ...card, due: isReviewDue(card.schedule) }];
  });
}
export async function createFlashcard(userId: number, input: {courseId: string; contentId: number; front: string; back: string}, isAdmin = false) {
  const available = await scopedContents(userId, input.courseId, isAdmin);
  if (!available.some(item => item.id === input.contentId)) throw new Error("Aula não autorizada.");
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  const id = crypto.randomUUID();
  const now = new Date();
  const card: FlashcardRecord = { ...input, front: input.front.trim(), back: input.back.trim(), schedule: initialReviewSchedule(now), createdAt: now.toISOString() };
  await db.insert(studyNotes).values({ userId, moduleId: CARD_PREFIX + id, content: JSON.stringify(card) });
  return listFlashcards(userId, input.courseId, isAdmin);
}
export async function rateFlashcard(userId: number, input: {courseId: string; id: string; rating: ReviewRating}, isAdmin = false) {
  const available = await scopedContents(userId, input.courseId, isAdmin);
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  const moduleId = CARD_PREFIX + input.id;
  const row = (await db.select().from(studyNotes).where(and(eq(studyNotes.userId, userId), eq(studyNotes.moduleId, moduleId))).limit(1))[0];
  const card = row && parseCard(row.content);
  if (!card || card.courseId !== input.courseId || !available.some(item => item.id === card.contentId)) throw new Error("Cartão não encontrado neste curso.");
  card.schedule = scheduleReview(card.schedule, input.rating);
  await db.update(studyNotes).set({ content: JSON.stringify(card) }).where(and(eq(studyNotes.id, row.id), eq(studyNotes.userId, userId)));
  return listFlashcards(userId, input.courseId, isAdmin);
}
export async function removeFlashcard(userId: number, input: {courseId: string; id: string}, isAdmin = false) {
  const cards = await listFlashcards(userId, input.courseId, isAdmin);
  if (!cards.some(item => item.id === input.id)) throw new Error("Cartão não encontrado neste curso.");
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  await db.delete(studyNotes).where(and(eq(studyNotes.userId, userId), eq(studyNotes.moduleId, CARD_PREFIX + input.id)));
  return listFlashcards(userId, input.courseId, isAdmin);
}
export async function rateQuestionReview(userId: number, id: number, rating: ReviewRating) {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  const row = (await db.select().from(studyReviewItems).where(and(eq(studyReviewItems.userId, userId), eq(studyReviewItems.id, id))).limit(1))[0];
  if (!row) throw new Error("Revisão não encontrada.");
  const parsed = safeJson(row.snapshotJson);
  if (!isRecord(parsed)) throw new Error("Revisão inválida.");
  const old = isRecord(parsed.reviewSchedule) ? parsed.reviewSchedule : initialReviewSchedule(row.createdAt);
  const previous: ReviewSchedule = {
    intervalDays: typeof old.intervalDays === "number" ? old.intervalDays : 0,
    repetitions: typeof old.repetitions === "number" ? old.repetitions : 0,
    ease: typeof old.ease === "number" ? old.ease : 2.5,
    dueAt: typeof old.dueAt === "string" ? old.dueAt : row.createdAt.toISOString(),
    lastReviewedAt: typeof old.lastReviewedAt === "string" ? old.lastReviewedAt : null,
  };
  const reviewSchedule = scheduleReview(previous, rating);
  await db.update(studyReviewItems).set({
    snapshotJson: JSON.stringify({ ...parsed, reviewSchedule }), status: "pending", reviewedAt: new Date(),
  }).where(and(eq(studyReviewItems.id, id), eq(studyReviewItems.userId, userId)));
  return reviewSchedule;
}
export async function getLearningDiagnostic(userId: number, courseId: string, isAdmin = false, minutes = 40) {
  const contents = await scopedContents(userId, courseId, isAdmin);
  const cards = await listFlashcards(userId, courseId, isAdmin);
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  const allowedQuestions = (await listStudyQuestions(userId, isAdmin)).questions;
  const ids = new Set(contents.map(content => content.id));
  const questionMap = new Map<string, {discipline: string}>(allowedQuestions
    .filter(question => question.contentIds.some(contentId => ids.has(contentId)))
    .flatMap(question => [
      [String(question.id), { discipline: question.discipline }] as const,
      [`central-${question.id}`, { discipline: question.discipline }] as const,
    ]));
  if (courseId === "pf-agente") questionBank.forEach(question => questionMap.set(question.id, { discipline: question.discipline }));
  const answers = await db.select().from(studyAnswers).where(eq(studyAnswers.userId, userId)).orderBy(desc(studyAnswers.answeredAt)).limit(2000);
  const latest = new Map<string, typeof answers[number]>();
  for (const answer of answers) if (!latest.has(answer.questionId) && questionMap.has(answer.questionId)) latest.set(answer.questionId, answer);
  const stats = new Map<string, {correct: number; total: number}>();
  for (const answer of Array.from(latest.values())) {
    const discipline = questionMap.get(answer.questionId)!.discipline;
    const stat = stats.get(discipline) ?? { correct: 0, total: 0 };
    stat.total++; if (answer.correct) stat.correct++;
    stats.set(discipline, stat);
  }
  const disciplines = Array.from(new Set([...contents.map(item => item.disciplineName), ...Array.from(stats.keys())]))
    .map(name => {
      const score = stats.get(name) ?? { correct: 0, total: 0 };
      return { name, ...score, accuracy: score.total ? Math.round(score.correct * 100 / score.total) : null,
        confidence: score.total >= 10 ? "suficiente" : "amostra_pequena" as const };
    }).sort((a,b) => (a.accuracy ?? -1) - (b.accuracy ?? -1) || a.name.localeCompare(b.name));
  const unfinished = contents.filter(item => item.progress?.status !== "completed");
  const priority = (content: typeof contents[number]) => {
    const stat = disciplines.find(item => item.name === content.disciplineName);
    return (content.progress?.status === "started" ? -70 : 0)
      + (stat?.accuracy === null || stat?.accuracy === undefined ? -15 : stat.accuracy)
      - (stat?.total && stat.total < 5 ? 10 : 0);
  };
  const ordered = [...unfinished].sort((a,b) => priority(a) - priority(b) || a.id - b.id);
  const sessionMinutes = minutes === 20 ? 10 : minutes === 60 ? 20 : 15;
  const count = Math.max(1, Math.floor(minutes / sessionMinutes));
  const today = ordered.slice(0, count).map(content => ({
    contentId: content.id, disciplineName: content.disciplineName, title: content.title,
    minutes: sessionMinutes, reason: content.progress?.status === "started" ? "Continue de onde parou"
      : disciplines.find(item => item.name === content.disciplineName)?.accuracy !== null ? "Prioridade de domínio e edital" : "Comece por aqui",
  }));
  const errors = Array.from(latest.values()).filter(row => !row.correct).length;
  return { courseId, minutes, completed: contents.length - unfinished.length, totalContents: contents.length,
    disciplines, today, pendingFlashcards: cards.filter(card => card.due).length,
    flashcardCount: cards.length, recentErrors: errors,
    caution: "As prioridades são estimativas baseadas em respostas registradas; amostras pequenas não comprovam domínio." };
}
export async function listErrorNotebook(userId: number, courseId: string, isAdmin = false) {
  const available = (await listStudyQuestions(userId, isAdmin)).questions;
  const contents = await scopedContents(userId, courseId, isAdmin);
  const contentIds = new Set(contents.map(item => item.id));
  const valid = available.filter(item => item.contentIds.some(id => contentIds.has(id)));
  // O caderno também incorpora os itens da trilha PF original (anterior ao banco central).
  const legacy = courseId === "pf-agente"
    ? questionBank.map(item => ({questionId:item.id,statement:item.statement,discipline:item.discipline,explanation:item.explanation}))
    : [];
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível");
  const answers = await db.select().from(studyAnswers).where(eq(studyAnswers.userId,userId)).orderBy(desc(studyAnswers.answeredAt)).limit(2000);
  const latest = new Map<string, boolean>();
  answers.forEach(answer => { if (!latest.has(answer.questionId)) latest.set(answer.questionId, answer.correct); });
  const notes = await db.select().from(studyNotes).where(and(eq(studyNotes.userId,userId),like(studyNotes.moduleId, "error:%")));
  const noteMap = new Map(notes.map(note=>[note.moduleId.slice(ERROR_PREFIX.length),safeJson(note.content)]));
  const persistedErrors = valid.filter(item => latest.get(String(item.id)) === false || latest.get(`central-${item.id}`) === false).map(item=>{
    const note = noteMap.get(`central-${item.id}`);
    return { questionId: `central-${item.id}`, statement: item.statement, discipline: item.discipline,
      explanation: item.explanation, reason: isRecord(note) && typeof note.reason === "string" ? note.reason : "nao_classificado",
      observation: isRecord(note) && typeof note.observation === "string" ? note.observation : "" };
  });
  const legacyErrors = legacy.filter(item => latest.get(item.questionId) === false).map(item=>{
    const note=noteMap.get(item.questionId);
    return { ...item, reason:isRecord(note) && typeof note.reason==="string"?note.reason:"nao_classificado",
      observation:isRecord(note) && typeof note.observation==="string"?note.observation:"" };
  });
  return [...persistedErrors, ...legacyErrors];
}
export async function classifyStudyError(userId:number,input:{courseId:string;questionId:string;reason:string;observation:string},isAdmin=false) {
 const errors = await listErrorNotebook(userId,input.courseId,isAdmin);
 if(!errors.some(item=>item.questionId===input.questionId))throw new Error("Esta questão não consta entre seus erros.");
 const db=await getDb(); if(!db)throw new Error("Banco indisponível");
 const content=JSON.stringify({reason:input.reason,observation:input.observation,courseId:input.courseId});
 await db.insert(studyNotes).values({userId,moduleId:ERROR_PREFIX+input.questionId,content})
   .onDuplicateKeyUpdate({set:{content}});
 return listErrorNotebook(userId,input.courseId,isAdmin);
}
