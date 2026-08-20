import { and, desc, eq, gt, inArray, like, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  adminAuditLogs,
  authSessions,
  commerceCoupons,
  commerceOrderItems,
  commerceOrders,
  commercePlanCourses,
  commercePlans,
  commerceTransactions,
  completedModules,
  contentChangelog,
  contents,
  courseDisciplines,
  courses,
  courseEnrollments,
  disciplineContents,
  disciplines,
  globalContactSettings,
  InsertUser,
  questionChangelog,
  questionContentLinks,
  questions,
  reviewQueue,
  simulationRecords,
  simulationQuestions,
  studyAnswers,
  studyNotes,
  studyProfiles,
  studyReviewItems,
  users,
} from "../drizzle/schema";
import { getEnrollmentLifecycleStatus } from "./enrollmentStatus";
import { DEFAULT_COURSES } from "./courseCatalog";
import { canUseQuestionInSimulation, requiresExclusiveCentralBank, uniqueSimulationQuestions } from "./question-bank-policy";
import { persistReviewDecision, type ReviewDecision as PersistedReviewDecision } from "./review-decision";
import { completeStudyModules } from "../client/src/data/pfCompleteStudyData";
import { contestCatalog, disciplineCatalog, getDisciplineIdForModule } from "../client/src/data/pfCurriculumCatalog";
import { questionBank, type StudyQuestion } from "../client/src/data/pfStudyData";
import { loadPF2018Questions } from "./importProvasPF";
import { isValidCpf, normalizeCpf } from "./cpf";
import { selectDailyQuickCheckQuestion } from "./dailyQuickCheck";

type UserUpsertInput = {
  openId: string;
  name?: string | null;
  username?: string | null;
  email?: string | null;
  passwordHash?: string | null;
  loginMethod?: string | null;
  role?: "user" | "admin";
  isBlocked?: boolean;
  lastSignedIn?: Date;
};

type LocalUserInput = {
  name: string;
  username: string;
  email: string | null;
  cpf?: string | null;
  passwordHash: string;
  role?: "user" | "admin";
};

type SimulationInput = {
  id: string;
  total: number;
  correct: number;
  errors: number;
  elapsedSeconds: number;
  byDiscipline: Record<string, { correct: number; total: number }>;
  byBlock: Record<string, { correct: number; total: number }>;
  answers: { questionId: string; correct: boolean }[];
  questionIds: string[];
  persistentAnswers?: { questionId: number; correct: boolean; snapshot: Record<string, unknown> }[];
};

export type StudyReviewSnapshot = {
  statement: string;
  answer: boolean;
  explanation: string;
  discipline: string;
  subject: string;
  source?: string;
};

export type CommercePlanInput = {
  code: string;
  title: string;
  description?: string | null;
  planType: "course_access" | "subscription";
  accessDurationDays: number;
  priceCents: number;
  isActive: boolean;
  isHighlighted: boolean;
  courseIds: string[];
};

export type CommerceCouponInput = {
  code: string;
  description?: string | null;
  discountType: "percentage" | "fixed_amount";
  discountValue: number;
  maxRedemptions?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive: boolean;
};

const emptyProfile = { xp: 0, lastStudyDate: null as string | null, studyDatesJson: "[]", usedQuestionIdsJson: "[]", dailyQuickCheckDate: null as string | null, dailyQuickCheckCourseId: null as string | null, dailyQuickCheckQuestionId: null as string | null, dailyQuickCheckDismissed: false };
let _db: ReturnType<typeof drizzle> | null = null;

function parseStringArray(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseMetric(raw: string) {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function parseStudyReviewSnapshot(raw: string): StudyReviewSnapshot | null {
  try {
    const parsed = JSON.parse(raw) as Partial<StudyReviewSnapshot>;
    if (!parsed || typeof parsed !== "object" || typeof parsed.statement !== "string" || typeof parsed.answer !== "boolean" || typeof parsed.explanation !== "string" || typeof parsed.discipline !== "string" || typeof parsed.subject !== "string") return null;
    return { statement: parsed.statement, answer: parsed.answer, explanation: parsed.explanation, discipline: parsed.discipline, subject: parsed.subject, ...(typeof parsed.source === "string" ? { source: parsed.source } : {}) };
  } catch {
    return null;
  }
}

function currentStudyDay() {
  return new Date().toISOString().slice(0, 10);
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: UserUpsertInput): Promise<void> {
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = {
    openId: user.openId,
    name: user.name?.trim() || "Usuário Núcleo Concursos",
    loginMethod: user.loginMethod || "oauth",
    role: user.role ?? "user",
    lastSignedIn: user.lastSignedIn ?? new Date(),
  };
  const updateSet: Record<string, unknown> = { lastSignedIn: values.lastSignedIn };
  if (user.name) updateSet.name = user.name.trim();
  if (user.email) updateSet.email = user.email.toLowerCase();
  if (user.loginMethod) updateSet.loginMethod = user.loginMethod;
  if (user.role) updateSet.role = user.role;
  if (user.isBlocked !== undefined) updateSet.isBlocked = user.isBlocked;
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result[0];
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return result[0];
}

export async function getUserByUsername(username: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.username, username.toLowerCase())).limit(1);
  return result[0];
}

export async function getUserByIdentifier(identifier: string) {
  const db = await getDb();
  if (!db) return undefined;
  const value = identifier.trim().toLowerCase();
  const result = await db.select().from(users).where(or(eq(users.username, value), eq(users.email, value))).limit(1);
  return result[0];
}

export async function getUserByCpf(cpf: string) {
  const db = await getDb();
  if (!db) return undefined;
  const normalized = normalizeCpf(cpf);
  if (!normalized) return undefined;
  const result = await db.select().from(users).where(eq(users.cpf, normalized)).limit(1);
  return result[0];
}

export async function createLocalUser(input: LocalUserInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const username = input.username.trim().toLowerCase();
  const email = input.email?.trim().toLowerCase() || null;
  const cpf = input.cpf ? normalizeCpf(input.cpf) : null;
  if (cpf && !isValidCpf(cpf)) throw new Error("CPF inválido.");
  await db.insert(users).values({
    openId: `local:${username}`,
    name: input.name.trim(),
    username,
    email,
    cpf,
    passwordHash: input.passwordHash,
    loginMethod: "local",
    role: input.role ?? "user",
  });
  const user = await getUserByUsername(username);
  if (!user) throw new Error("Conta criada, mas não encontrada");
  await ensureStudyProfile(user.id);
  return user;
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateUserPassword(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(users).set({ passwordHash }).where(eq(users.id, userId));
}

/** Converte a identidade proprietária existente para a conta local ROOT, preservando o userId e o histórico. */
export async function convertUserToLocalRoot(userId: number, passwordHash: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(users).set({
    openId: "local:paulo",
    name: "Paulo André",
    username: "paulo",
    passwordHash,
    loginMethod: "local",
    role: "admin",
  }).where(eq(users.id, userId));
}

export async function updateUserProfile(userId: number, input: { name: string; username: string; email: string; cpf?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const username = input.username.trim().toLowerCase();
  const cpf = input.cpf === undefined ? undefined : normalizeCpf(input.cpf);
  if (cpf !== undefined && !isValidCpf(cpf)) throw new Error("CPF inválido.");
  await db.update(users).set({
    name: input.name.trim(),
    username,
    email: input.email.trim().toLowerCase(),
    ...(cpf === undefined ? {} : { cpf }),
  }).where(eq(users.id, userId));
  return getUserById(userId);
}

export async function replaceSessionForUser(userId: number, id: string, tokenHash: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const activeSession = await db.select({ id: authSessions.id }).from(authSessions)
    .where(and(eq(authSessions.userId, userId), gt(authSessions.expiresAt, new Date())))
    .limit(1);
  await db.transaction(async (tx) => {
    await tx.delete(authSessions).where(eq(authSessions.userId, userId));
    await tx.insert(authSessions).values({ id, userId, tokenHash, expiresAt });
  });
  return { hadActiveSession: Boolean(activeSession[0]) };
}

export async function getUserFromSessionHash(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const session = await db.select().from(authSessions).where(and(eq(authSessions.tokenHash, tokenHash), gt(authSessions.expiresAt, new Date()))).limit(1);
  if (!session[0]) return undefined;
  return getUserById(session[0].userId);
}

export async function deleteSessionByHash(tokenHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(authSessions).where(eq(authSessions.tokenHash, tokenHash));
}

export async function deleteSessionsForUser(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(authSessions).where(eq(authSessions.userId, userId));
}

export type GlobalContactSettingsInput = {
  email?: string | null;
  telegramUrl?: string | null;
};

export async function getGlobalContactSettings() {
  const db = await getDb();
  if (!db) return { email: null, telegramUrl: null, updatedAt: null };
  const row = await db.select().from(globalContactSettings).where(eq(globalContactSettings.id, 1)).limit(1);
  return row[0] ?? { email: null, telegramUrl: null, updatedAt: null };
}

export async function saveGlobalContactSettings(actorUserId: number, input: GlobalContactSettingsInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const email = input.email?.trim().toLowerCase() || null;
  const telegramUrl = input.telegramUrl?.trim() || null;
  await db.insert(globalContactSettings).values({ id: 1, email, telegramUrl, updatedByUserId: actorUserId })
    .onDuplicateKeyUpdate({ set: { email, telegramUrl, updatedByUserId: actorUserId } });
  return getGlobalContactSettings();
}

async function ensureStudyProfile(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await db.select().from(studyProfiles).where(eq(studyProfiles.userId, userId)).limit(1);
  if (existing[0]) return existing[0];
  await db.insert(studyProfiles).values({ userId, ...emptyProfile });
  const created = await db.select().from(studyProfiles).where(eq(studyProfiles.userId, userId)).limit(1);
  return created[0]!;
}

async function registerStudyActivity(userId: number, xpDelta: number, questionIds: string[] = []) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const profile = await ensureStudyProfile(userId);
  const day = currentStudyDay();
  const studyDates = Array.from(new Set([...parseStringArray(profile.studyDatesJson), day]));
  const usedQuestionIds = Array.from(new Set([...parseStringArray(profile.usedQuestionIdsJson), ...questionIds]));
  await db.update(studyProfiles).set({
    xp: profile.xp + xpDelta,
    lastStudyDate: day,
    studyDatesJson: JSON.stringify(studyDates),
    usedQuestionIdsJson: JSON.stringify(usedQuestionIds),
  }).where(eq(studyProfiles.userId, userId));
}

export async function getStudyState(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const profile = await ensureStudyProfile(userId);
  const [modules, answers, simulations] = await Promise.all([
    db.select().from(completedModules).where(eq(completedModules.userId, userId)),
    db.select().from(studyAnswers).where(eq(studyAnswers.userId, userId)).orderBy(desc(studyAnswers.answeredAt)),
    db.select().from(simulationRecords).where(eq(simulationRecords.userId, userId)).orderBy(desc(simulationRecords.completedAt)),
  ]);
  return {
    completedModules: modules.map(item => item.moduleId),
    answers: answers.reverse().map(item => ({ questionId: item.questionId, correct: item.correct, answeredAt: item.answeredAt.toISOString() })),
    simulations: simulations.reverse().map(item => ({
      id: item.id,
      date: item.completedAt.toISOString(),
      total: item.total,
      correct: item.correct,
      errors: item.errors,
      elapsedSeconds: item.elapsedSeconds,
      byDiscipline: parseMetric(item.byDisciplineJson),
      byBlock: parseMetric(item.byBlockJson),
    })),
    xp: profile.xp,
    lastStudyDate: profile.lastStudyDate ?? undefined,
    studyDates: parseStringArray(profile.studyDatesJson),
    usedQuestionIds: parseStringArray(profile.usedQuestionIdsJson),
  };
}

async function getEligibleContentIdsForCourses(courseIds: string[]) {
  const db = await getDb();
  if (!db || !courseIds.length) return [];
  const rows = await db.select({ contentId: disciplineContents.contentId }).from(courseDisciplines)
    .innerJoin(disciplineContents, eq(courseDisciplines.disciplineId, disciplineContents.disciplineId))
    .where(inArray(courseDisciplines.courseId, courseIds));
  return Array.from(new Set(rows.map(row => row.contentId)));
}

export async function getDailyQuickCheck(userId: number, courseId: string) {
  const access = await getUserCourseAccess(userId);
  if (!access.some(enrollment => enrollment.courseId === courseId)) throw new Error("A checagem diária só está disponível para cursos com matrícula vigente.");
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const profile = await ensureStudyProfile(userId);
  const day = currentStudyDay();
  const allowedContentIds = await getEligibleContentIdsForCourses([courseId]);
  const questionPool = (await listStudyQuestions()).questions.filter(question => question.contentIds.some(contentId => allowedContentIds.includes(contentId)));
  const persistedQuestion = profile.dailyQuickCheckDate === day && profile.dailyQuickCheckCourseId === courseId
    ? questionPool.find(question => String(question.id) === profile.dailyQuickCheckQuestionId)
    : undefined;
  const recentAnswers = await db.select({ questionId: studyAnswers.questionId }).from(studyAnswers).where(eq(studyAnswers.userId, userId)).orderBy(desc(studyAnswers.answeredAt)).limit(20);
  const recentQuestionIds = [...recentAnswers.map(answer => answer.questionId), ...(profile.dailyQuickCheckQuestionId ? [profile.dailyQuickCheckQuestionId] : [])];
  const question = persistedQuestion ?? selectDailyQuickCheckQuestion({ questions: questionPool, userId, courseId, day, recentQuestionIds });
  if (!question) return { date: day, dismissed: false, question: null };

  if (!persistedQuestion) await db.update(studyProfiles).set({
    dailyQuickCheckDate: day,
    dailyQuickCheckCourseId: courseId,
    dailyQuickCheckQuestionId: String(question.id),
    dailyQuickCheckDismissed: false,
  }).where(eq(studyProfiles.userId, userId));

  return { date: day, dismissed: persistedQuestion ? profile.dailyQuickCheckDismissed : false, question };
}

export async function dismissDailyQuickCheck(userId: number, courseId: string) {
  const current = await getDailyQuickCheck(userId, courseId);
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  if (current.question) await db.update(studyProfiles).set({ dailyQuickCheckDismissed: true }).where(eq(studyProfiles.userId, userId));
  return { success: true } as const;
}

export async function recordAnswer(userId: number, questionId: string, correct: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(studyAnswers).values({ userId, questionId, correct });
  await registerStudyActivity(userId, correct ? 8 : 2);
  return getStudyState(userId);
}

export async function listStudyReviewItems(userId: number, status: "pending" | "mastered" = "pending") {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db.select().from(studyReviewItems).where(and(eq(studyReviewItems.userId, userId), eq(studyReviewItems.status, status))).orderBy(desc(studyReviewItems.createdAt));
  return rows.flatMap(item => {
    const snapshot = parseStudyReviewSnapshot(item.snapshotJson);
    return snapshot ? [{ id: item.id, questionKey: item.questionKey, snapshot, status: item.status, createdAt: item.createdAt.toISOString(), reviewedAt: item.reviewedAt?.toISOString() ?? null }] : [];
  });
}

export async function saveStudyReviewItem(userId: number, input: { questionKey: string; snapshot: StudyReviewSnapshot }) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(studyReviewItems).values({ userId, questionKey: input.questionKey, snapshotJson: JSON.stringify(input.snapshot), status: "pending", reviewedAt: null }).onDuplicateKeyUpdate({ set: { snapshotJson: JSON.stringify(input.snapshot), status: "pending", reviewedAt: null } });
  return listStudyReviewItems(userId);
}

export async function completeStudyReviewItem(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(studyReviewItems).set({ status: "mastered", reviewedAt: new Date() }).where(and(eq(studyReviewItems.id, id), eq(studyReviewItems.userId, userId)));
  return listStudyReviewItems(userId);
}

export async function removeStudyReviewItem(userId: number, id: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.delete(studyReviewItems).where(and(eq(studyReviewItems.id, id), eq(studyReviewItems.userId, userId)));
  return listStudyReviewItems(userId);
}

export async function completeStudyModule(userId: number, moduleId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await db.select().from(completedModules).where(and(eq(completedModules.userId, userId), eq(completedModules.moduleId, moduleId))).limit(1);
  if (!existing[0]) {
    await db.insert(completedModules).values({ userId, moduleId });
    await registerStudyActivity(userId, 20);
  }
  return getStudyState(userId);
}

export async function recordSimulation(userId: number, input: SimulationInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(simulationRecords).values({
    id: input.id,
    userId,
    total: input.total,
    correct: input.correct,
    errors: input.errors,
    elapsedSeconds: input.elapsedSeconds,
    byDisciplineJson: JSON.stringify(input.byDiscipline),
    byBlockJson: JSON.stringify(input.byBlock),
  });
  if (input.answers.length) await db.insert(studyAnswers).values(input.answers.map(answer => ({ ...answer, userId })));
  const persistentAnswers = uniqueSimulationQuestions((input.persistentAnswers ?? []).map(answer => ({ ...answer, id: answer.questionId, status: "published" as const, requiresReview: true })));
  if (persistentAnswers.length) await db.insert(simulationQuestions).values(persistentAnswers.map((answer, position) => ({ simulationId: input.id, questionId: answer.questionId, position: position + 1, answeredCorrectly: answer.correct, snapshotJson: JSON.stringify(answer.snapshot) })));
  await registerStudyActivity(userId, input.correct * 8 + 15, input.questionIds);
  return getStudyState(userId);
}

export async function getNote(userId: number, moduleId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const note = await db.select().from(studyNotes).where(and(eq(studyNotes.userId, userId), eq(studyNotes.moduleId, moduleId))).limit(1);
  return note[0] ?? null;
}

export type PrivateNoteRepository<TNote> = {
  find: (userId: number, moduleId: string) => Promise<TNote | null>;
  create: (userId: number, moduleId: string, content: string) => Promise<TNote>;
  update: (note: TNote, content: string) => Promise<TNote>;
};

export async function upsertPrivateNote<TNote>(repository: PrivateNoteRepository<TNote>, userId: number, moduleId: string, content: string) {
  const existing = await repository.find(userId, moduleId);
  return existing ? repository.update(existing, content) : repository.create(userId, moduleId, content);
}

export async function saveNote(userId: number, moduleId: string, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return upsertPrivateNote({
    find: getNote,
    create: async (ownerUserId, ownerModuleId, nextContent) => {
      await db.insert(studyNotes).values({ userId: ownerUserId, moduleId: ownerModuleId, content: nextContent });
      const created = await getNote(ownerUserId, ownerModuleId);
      if (!created) throw new Error("Anotação não foi salva");
      return created;
    },
    update: async (note, nextContent) => {
      await db.update(studyNotes).set({ content: nextContent }).where(eq(studyNotes.id, note.id));
      const updated = await getNote(note.userId, note.moduleId);
      if (!updated) throw new Error("Anotação não foi encontrada após a atualização");
      return updated;
    },
  }, userId, moduleId, content);
}

/** Utilitário interno para limpeza controlada em testes integrados. */
export async function deleteNoteByScope(userId: number, moduleId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.delete(studyNotes).where(and(eq(studyNotes.userId, userId), eq(studyNotes.moduleId, moduleId)));
}

export async function listManagedUsers(search?: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const term = search?.trim().toLowerCase();
  const query = db.select({
    id: users.id, name: users.name, username: users.username, email: users.email, cpf: users.cpf, role: users.role,
    isBlocked: users.isBlocked, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn,
  }).from(users);
  if (!term) return query.orderBy(desc(users.createdAt)).limit(100);
  return query.where(or(like(users.name, `%${term}%`), like(users.username, `%${term}%`), like(users.email, `%${term}%`), like(users.cpf, `%${term.replace(/\D/g, "")}%`))).orderBy(desc(users.createdAt)).limit(100);
}

export async function getAdminStats() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const [usersCount, blockedCount, answersCount, simulationsCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    db.select({ count: sql<number>`count(*)` }).from(users).where(eq(users.isBlocked, true)),
    db.select({ count: sql<number>`count(*)` }).from(studyAnswers),
    db.select({ count: sql<number>`count(*)` }).from(simulationRecords),
  ]);
  return { users: Number(usersCount[0]?.count ?? 0), blocked: Number(blockedCount[0]?.count ?? 0), answers: Number(answersCount[0]?.count ?? 0), simulations: Number(simulationsCount[0]?.count ?? 0) };
}

export async function writeAdminAudit(actorUserId: number, affectedUserId: number | null, action: string, detail: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(adminAuditLogs).values({ actorUserId, affectedUserId, action, detail });
}

export async function updateManagedUser(userId: number, input: { name: string; username: string; email: string; cpf?: string }) {
  return updateUserProfile(userId, input);
}

export async function setUserBlocked(userId: number, isBlocked: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.update(users).set({ isBlocked }).where(eq(users.id, userId));
  if (isBlocked) await deleteSessionsForUser(userId);
}

export async function deleteManagedUser(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await Promise.all([
    db.delete(authSessions).where(eq(authSessions.userId, userId)),
    db.delete(courseEnrollments).where(eq(courseEnrollments.userId, userId)),
    db.delete(completedModules).where(eq(completedModules.userId, userId)),
    db.delete(studyAnswers).where(eq(studyAnswers.userId, userId)),
    db.delete(simulationRecords).where(eq(simulationRecords.userId, userId)),
    db.delete(studyNotes).where(eq(studyNotes.userId, userId)),
    db.delete(studyProfiles).where(eq(studyProfiles.userId, userId)),
    db.delete(studyReviewItems).where(eq(studyReviewItems.userId, userId)),
  ]);
  await db.delete(users).where(eq(users.id, userId));
}

export async function listAdminAuditLogs() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.select().from(adminAuditLogs).orderBy(desc(adminAuditLogs.createdAt)).limit(100);
}

export type ManagedCourseInput = {
  id: string;
  title: string;
  track: string;
  description?: string | null;
  coverImageUrl?: string | null;
};

export async function listManagedCourses() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.select().from(courses).orderBy(desc(courses.createdAt));
}

export async function getManagedCourseById(courseId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.select().from(courses).where(eq(courses.id, courseId)).limit(1);
  return result[0];
}

export async function createManagedCourse(actorUserId: number, input: ManagedCourseInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await getManagedCourseById(input.id);
  if (existing) throw new Error("Já existe um curso com este código.");
  await db.insert(courses).values({
    id: input.id,
    title: input.title,
    track: input.track,
    description: input.description?.trim() || null,
    coverImageUrl: input.coverImageUrl?.trim() || null,
    isActive: true,
    createdByUserId: actorUserId,
  });
  const created = await getManagedCourseById(input.id);
  if (!created) throw new Error("Curso não foi salvo.");
  await writeAdminAudit(actorUserId, null, "CRIACAO_DE_CURSO", `Curso ${created.id} — ${created.title} criado.`);
  return created;
}

export async function updateManagedCourse(actorUserId: number, courseId: string, input: Omit<ManagedCourseInput, "id">) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await getManagedCourseById(courseId);
  if (!existing) throw new Error("Curso não encontrado.");
  await db.update(courses).set({
    title: input.title,
    track: input.track,
    description: input.description?.trim() || null,
    coverImageUrl: input.coverImageUrl?.trim() || null,
  }).where(eq(courses.id, courseId));
  const updated = await getManagedCourseById(courseId);
  if (!updated) throw new Error("Curso não foi atualizado.");
  await writeAdminAudit(actorUserId, null, "ATUALIZACAO_DE_CURSO", `Curso ${courseId} atualizado.`);
  return updated;
}

export async function setManagedCourseActive(actorUserId: number, courseId: string, isActive: boolean) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await getManagedCourseById(courseId);
  if (!existing) throw new Error("Curso não encontrado.");
  await db.update(courses).set({ isActive }).where(eq(courses.id, courseId));
  const updated = await getManagedCourseById(courseId);
  if (!updated) throw new Error("Curso não encontrado.");
  await writeAdminAudit(actorUserId, null, isActive ? "ATIVACAO_DE_CURSO" : "DESATIVACAO_DE_CURSO", `Curso ${updated.id} ${isActive ? "ativado" : "desativado"}.`);
  return updated;
}

/** Remove apenas o curso e suas relações diretas; a biblioteca central continua intacta para outros concursos. */
export async function deleteManagedCourse(actorUserId: number, courseId: string, confirmation: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  if (confirmation !== courseId) throw new Error("Confirme digitando exatamente o código do curso.");
  const existing = await getManagedCourseById(courseId);
  if (!existing) throw new Error("Curso não encontrado.");
  const [links, enrollments] = await Promise.all([
    db.select({ id: courseDisciplines.id }).from(courseDisciplines).where(eq(courseDisciplines.courseId, courseId)),
    db.select({ id: courseEnrollments.id }).from(courseEnrollments).where(eq(courseEnrollments.courseId, courseId)),
  ]);
  await db.delete(courseDisciplines).where(eq(courseDisciplines.courseId, courseId));
  await db.delete(courseEnrollments).where(eq(courseEnrollments.courseId, courseId));
  await db.delete(courses).where(eq(courses.id, courseId));
  await writeAdminAudit(actorUserId, null, "EXCLUSAO_DE_CURSO", `Curso ${existing.id} — ${existing.title} excluído; ${links.length} vínculo(s) e ${enrollments.length} matrícula(s) removidos. Disciplinas, conteúdos e questões foram preservados.`);
  return { id: existing.id, title: existing.title, removedLinks: links.length, removedEnrollments: enrollments.length };
}

/** Cria as três matrizes iniciais uma única vez no banco de uma instância nova. */
export async function ensureDefaultCourses(actorUserId: number) {
  const db = await getDb();
  if (!db) return;
  for (const course of DEFAULT_COURSES) {
    const existing = await db.select({ id: courses.id }).from(courses).where(eq(courses.id, course.id)).limit(1);
    if (!existing[0]) await db.insert(courses).values({ ...course, createdByUserId: actorUserId, isActive: true });
  }
}

function normalizeSearchText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase();
}

export function legacyQuestionDifficulty(value: StudyQuestion["difficulty"]): QuestionDifficulty {
  if (value === "Fácil") return "basic";
  if (value === "Difícil") return "advanced";
  return "intermediate";
}

export function legacyDisciplineId(label: string) {
  const value = normalizeSearchText(label);
  if (value.includes("portugues")) return "lingua-portuguesa";
  if (value.includes("administrativo")) return "direito-administrativo";
  if (value.includes("constitucional")) return "direito-constitucional";
  if (value.includes("processual")) return "direito-processual-penal";
  if (value.includes("penal")) return "direito-penal";
  if (value.includes("humanos")) return "direitos-humanos";
  if (value.includes("legislacao")) return "legislacao-especial";
  if (value.includes("informatica")) return "informatica";
  if (value.includes("estatistica")) return "estatistica";
  if (value.includes("logico")) return "raciocinio-logico";
  if (value.includes("contabilidade")) return "contabilidade-geral";
  return null;
}

function contentForLegacyQuestion(question: StudyQuestion, contentIdsByTitle: Map<string, number>) {
  const disciplineId = legacyDisciplineId(question.discipline);
  if (!disciplineId) return undefined;
  const questionText = normalizeSearchText(`${question.subject} ${question.statement}`);
  const best = completeStudyModules.filter(module => getDisciplineIdForModule(module) === disciplineId).map(module => {
    const terms = normalizeSearchText(`${module.title} ${module.concepts.join(" ")}`).split(/[^a-z0-9]+/).filter(term => term.length >= 4);
    return { module, score: terms.reduce((total, term) => total + (questionText.includes(term) ? 1 : 0), 0) };
  }).sort((left, right) => right.score - left.score || left.module.code.localeCompare(right.module.code))[0];
  return best ? contentIdsByTitle.get(`${best.module.code} — ${best.module.title}`) : undefined;
}

async function importLegacyQuestions(actorUserId: number, contentIdsByTitle: Map<string, number>) {
  const db = await getDb();
  if (!db) return 0;
  const rows = await db.select({ id: questions.id, source: questions.source }).from(questions);
  const idsBySource = new Map(rows.filter(row => row.source?.startsWith("LEGADO_ESTUDOS_PF:")).map(row => [row.source!.split(" | ")[0].replace("LEGADO_ESTUDOS_PF:", ""), row.id]));
  let imported = 0;
  for (const legacy of questionBank) {
    const marker = `LEGADO_ESTUDOS_PF:${legacy.id}`;
    let questionId = idsBySource.get(legacy.id);
    if (!questionId) {
      const result = await db.insert(questions).values({
        statement: legacy.statement, questionType: "certo_errado", optionsJson: "[]", answerJson: JSON.stringify(legacy.answer),
        explanation: `${legacy.explanation}\n\nDica de revisão: ${legacy.tip}`, difficulty: legacyQuestionDifficulty(legacy.difficulty),
        source: `${marker} | ${legacy.source}`.slice(0, 240), banca: "Estudos PF", status: "published", requiresReview: false,
        createdByUserId: actorUserId, updatedByUserId: actorUserId,
      });
      questionId = Number(result[0].insertId);
      imported += 1;
    }
    const contentId = contentForLegacyQuestion(legacy, contentIdsByTitle);
    if (!contentId) continue;
    const existingLink = await db.select({ id: questionContentLinks.id }).from(questionContentLinks).where(and(eq(questionContentLinks.questionId, questionId), eq(questionContentLinks.contentId, contentId))).limit(1);
    if (!existingLink[0]) await db.insert(questionContentLinks).values({ questionId, contentId, linkedByUserId: actorUserId });
  }
  return imported;
}

/** Importa somente itens conciliados com o gabarito oficial do Cargo 12, sem remover vínculos editoriais posteriores. */
async function importPF2018Questions(actorUserId: number, contentIdsByTitle: Map<string, number>) {
  const db = await getDb();
  if (!db) return 0;
  const drafts = loadPF2018Questions();
  const contentIdsByCode = new Map(
    Array.from(contentIdsByTitle.entries()).map(([title, contentId]) => [title.split(" — ")[0].toUpperCase(), contentId]),
  );
  const missingContentCodes = Array.from(new Set(drafts.flatMap(draft => draft.contentCodes)))
    .filter(code => !contentIdsByCode.has(code));
  if (missingContentCodes.length) {
    throw new Error(`A importação PF 2018 não encontrou conteúdos centrais para: ${missingContentCodes.join(", ")}.`);
  }

  const rows = await db.select({ id: questions.id, source: questions.source }).from(questions);
  const questionIdsByMarker = new Map(
    rows
      .filter(row => row.source?.startsWith("PROVA_PF_2018:item_"))
      .map(row => [row.source!.split(" | ")[0], row.id]),
  );
  let imported = 0;

  for (const draft of drafts) {
    const marker = `PROVA_PF_2018:item_${draft.itemNumber}`;
    let questionId = questionIdsByMarker.get(marker);
    if (!questionId) {
      const result = await db.insert(questions).values({
        statement: draft.statement,
        questionType: "certo_errado",
        optionsJson: "[]",
        answerJson: JSON.stringify(draft.answer),
        explanation: "Resposta conforme o gabarito preliminar oficial da prova PF 2018, Cargo 12 (Agente).",
        difficulty: "intermediate",
        source: draft.source,
        banca: "CESPE/CEBRASPE",
        year: 2018,
        status: "published",
        requiresReview: false,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      });
      questionId = Number(result[0].insertId);
      questionIdsByMarker.set(marker, questionId);
      await writeQuestionChange(questionId, actorUserId, "created", null, { statement: draft.statement, source: draft.source });
      imported += 1;
    }

    for (const contentCode of draft.contentCodes) {
      const contentId = contentIdsByCode.get(contentCode)!;
      const existingLink = await db.select({ id: questionContentLinks.id })
        .from(questionContentLinks)
        .where(and(eq(questionContentLinks.questionId, questionId), eq(questionContentLinks.contentId, contentId)))
        .limit(1);
      if (!existingLink[0]) {
        await db.insert(questionContentLinks).values({ questionId, contentId, linkedByUserId: actorUserId });
        await writeQuestionChange(questionId, actorUserId, "contentLink", null, contentId);
      }
    }
  }
  return imported;
}

/**
 * Disponibiliza na biblioteca persistente os módulos didáticos que já existiam
 * na trilha de estudo. A rotina é idempotente e não substitui conteúdo criado
 * manualmente: cursos apenas apontam para disciplinas e conteúdos reutilizáveis.
 */
export async function ensureDefaultKnowledgeBase(actorUserId: number) {
  const db = await getDb();
  if (!db) return;

  const currentContents = await db.select({ id: contents.id, title: contents.title }).from(contents);
  const contentIdsByTitle = new Map(currentContents.map(content => [content.title, content.id]));
  const contentIdsByDiscipline = new Map<string, number[]>();
  let importedContents = 0;

  for (const module of completeStudyModules) {
    const disciplineCatalogId = getDisciplineIdForModule(module);
    if (!disciplineCatalogId) continue;
    const title = `${module.code} — ${module.title}`;
    let contentId = contentIdsByTitle.get(title);
    if (!contentId) {
      const result = await db.insert(contents).values({
        title,
        description: module.summary,
        body: [
          module.summary,
          `Conceitos-chave: ${module.concepts.join("; ")}.`,
          `Pontos de atenção: ${module.attention.join("; ")}.`,
          `Exemplo: ${module.example}`,
          `Roteiro rápido: ${module.fastTrack.join(" ")}`,
          `Mnemônico: ${module.mnemonic}`,
        ].join("\n\n"),
        status: "published",
        requiresReview: false,
        createdByUserId: actorUserId,
        updatedByUserId: actorUserId,
      });
      contentId = Number(result[0].insertId);
      contentIdsByTitle.set(title, contentId);
      importedContents += 1;
    }
    contentIdsByDiscipline.set(disciplineCatalogId, [...(contentIdsByDiscipline.get(disciplineCatalogId) ?? []), contentId]);
  }

  const currentDisciplines = await db.select({ id: disciplines.id, shortName: disciplines.shortName }).from(disciplines);
  const disciplineIdsByShortName = new Map(currentDisciplines.map(discipline => [discipline.shortName, discipline.id]));
  const availableCourseIds = new Set((await db.select({ id: courses.id }).from(courses)).map(course => course.id));
  let importedDisciplines = 0;

  for (const discipline of disciplineCatalog) {
    const shortName = discipline.shortName.toUpperCase();
    if (disciplineIdsByShortName.has(shortName)) continue;
    const result = await db.insert(disciplines).values({
      name: discipline.name,
      shortName,
      description: discipline.description,
      status: "published",
      requiresReview: false,
      createdByUserId: actorUserId,
      updatedByUserId: actorUserId,
    });
    const disciplineId = Number(result[0].insertId);
    disciplineIdsByShortName.set(shortName, disciplineId);
    importedDisciplines += 1;

    for (const contest of contestCatalog.filter(contest => contest.disciplineIds.includes(discipline.id) && availableCourseIds.has(contest.id))) {
      await db.insert(courseDisciplines).values({ courseId: contest.id, disciplineId, linkedByUserId: actorUserId });
    }
    for (const contentId of contentIdsByDiscipline.get(discipline.id) ?? []) {
      await db.insert(disciplineContents).values({ disciplineId, contentId, linkedByUserId: actorUserId });
    }
  }

  const importedQuestions = await importLegacyQuestions(actorUserId, contentIdsByTitle);
  const importedPF2018Questions = await importPF2018Questions(actorUserId, contentIdsByTitle);
  if (importedContents || importedDisciplines || importedQuestions || importedPF2018Questions) {
    await writeAdminAudit(actorUserId, null, "SEMEADURA_BIBLIOTECA_CENTRAL", `${importedDisciplines} disciplina(s), ${importedContents} conteúdo(s), ${importedQuestions} questão(ões) legadas e ${importedPF2018Questions} questão(ões) da prova PF 2018 foram disponibilizadas na biblioteca central.`);
  }
}

function serializeEnrollment(enrollment: typeof courseEnrollments.$inferSelect) {
  return { ...enrollment, computedStatus: getEnrollmentLifecycleStatus(enrollment) };
}

export async function listUserEnrollments(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db.select().from(courseEnrollments).where(eq(courseEnrollments.userId, userId)).orderBy(desc(courseEnrollments.createdAt));
  return rows.map(serializeEnrollment);
}

export async function getUserCourseAccess(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db.select().from(courseEnrollments).where(and(
    eq(courseEnrollments.userId, userId),
    eq(courseEnrollments.status, "active"),
    sql`${courseEnrollments.startAt} <= NOW()`,
    sql`${courseEnrollments.expiresAt} > NOW()`,
  ));
  return rows.map(serializeEnrollment);
}

/** Cursos e capas que podem ser apresentados na área de estudos do usuário autenticado. */
export async function listStudyCourseCatalog(userId: number, includeInactive = false) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const fields = {
    id: courses.id,
    title: courses.title,
    track: courses.track,
    description: courses.description,
    coverImageUrl: courses.coverImageUrl,
    isActive: courses.isActive,
  };
  if (includeInactive) return db.select(fields).from(courses);

  const activeEnrollments = await getUserCourseAccess(userId);
  const courseIds = activeEnrollments.map(enrollment => enrollment.courseId);
  if (!courseIds.length) return [];
  return db.select(fields).from(courses).where(and(eq(courses.isActive, true), inArray(courses.id, courseIds)));
}

export async function grantCourseEnrollment(actorUserId: number, userId: number, courseId: string, startAt: Date, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const course = await getManagedCourseById(courseId);
  if (!course || !course.isActive) throw new Error("Curso não encontrado ou indisponível para matrícula.");
  const existing = await db.select().from(courseEnrollments).where(and(eq(courseEnrollments.userId, userId), eq(courseEnrollments.courseId, courseId))).limit(1);
  let enrollment;
  if (existing[0]) {
    await db.update(courseEnrollments).set({ startAt, expiresAt, status: "active", revokedAt: null }).where(eq(courseEnrollments.id, existing[0].id));
    enrollment = await db.select().from(courseEnrollments).where(eq(courseEnrollments.id, existing[0].id)).limit(1);
  } else {
    const result = await db.insert(courseEnrollments).values({ userId, courseId, startAt, expiresAt, status: "active", createdByUserId: actorUserId });
    enrollment = await db.select().from(courseEnrollments).where(eq(courseEnrollments.id, result[0].insertId)).limit(1);
  }
  const saved = enrollment[0];
  if (!saved) throw new Error("Matrícula não foi salva");
  await writeAdminAudit(actorUserId, userId, "LIBERACAO_DE_CURSO", `Curso ${courseId} liberado de ${startAt.toISOString()} até ${expiresAt.toISOString()}.`);
  return serializeEnrollment(saved);
}

export async function revokeCourseEnrollment(actorUserId: number, userId: number, courseId: string) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await db.select().from(courseEnrollments).where(and(eq(courseEnrollments.userId, userId), eq(courseEnrollments.courseId, courseId))).limit(1);
  if (!existing[0]) throw new Error("Matrícula não encontrada");
  await db.update(courseEnrollments).set({ status: "revoked", revokedAt: new Date() }).where(eq(courseEnrollments.id, existing[0].id));
  await writeAdminAudit(actorUserId, userId, "REVOGACAO_DE_CURSO", `Curso ${courseId} revogado.`);
  const updated = await db.select().from(courseEnrollments).where(eq(courseEnrollments.id, existing[0].id)).limit(1);
  return updated[0] ? serializeEnrollment(updated[0]) : null;
}

export type KnowledgeStatus = "draft" | "review" | "approved" | "published" | "inactive";
export type QuestionType = "certo_errado" | "multipla_escolha";
export type QuestionDifficulty = "basic" | "intermediate" | "advanced";
export type ReviewItemType = "question" | "content";
export type ReviewDecision = "approved" | "rejected" | "correction_requested";

type DisciplineInput = {
  name: string;
  shortName: string;
  description?: string | null;
  requiresReview: boolean;
  status?: KnowledgeStatus;
  courseIds?: string[];
  contentIds?: number[];
};

type ContentInput = {
  title: string;
  objective?: string | null;
  description?: string | null;
  cardText?: string | null;
  body?: string | null;
  coverImageUrl?: string | null;
  videoUrl?: string | null;
  videoLabel?: string | null;
  materialUrl?: string | null;
  materialLabel?: string | null;
  requiresReview: boolean;
  status?: KnowledgeStatus;
  disciplineIds?: number[];
};

export type ManagedQuestionInput = {
  statement: string;
  questionType: QuestionType;
  options: string[];
  answer: boolean | string;
  explanation?: string | null;
  difficulty: QuestionDifficulty;
  source?: string | null;
  banca?: string | null;
  year?: number | null;
  requiresReview: boolean;
  status?: KnowledgeStatus;
  contentIds: number[];
};

function uniqueNumbers(values: number[] = []) {
  return Array.from(new Set(values.filter(value => Number.isInteger(value) && value > 0)));
}

function uniqueCourseIds(values: string[] = []) {
  return Array.from(new Set(values.map(value => value.trim().toLowerCase()).filter(Boolean)));
}

function normalizeOptional(value?: string | null) {
  const normalized = value?.trim();
  return normalized || null;
}

function serializeField(value: unknown) {
  return value === null || value === undefined ? null : typeof value === "string" ? value : JSON.stringify(value);
}

function valueChanged(previous: unknown, next: unknown) {
  return serializeField(previous) !== serializeField(next);
}

async function assertExistingContentIds(contentIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  for (const contentId of uniqueNumbers(contentIds)) {
    const row = await db.select({ id: contents.id }).from(contents).where(eq(contents.id, contentId)).limit(1);
    if (!row[0]) throw new Error(`Conteúdo ${contentId} não encontrado.`);
  }
}

async function writeQuestionChange(questionId: number, actorUserId: number, changedField: string, oldValue: unknown, newValue: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(questionChangelog).values({ questionId, actorUserId, changedField, oldValue: serializeField(oldValue), newValue: serializeField(newValue) });
}

async function writeContentChange(contentId: number, actorUserId: number, changedField: string, oldValue: unknown, newValue: unknown) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  await db.insert(contentChangelog).values({ contentId, actorUserId, changedField, oldValue: serializeField(oldValue), newValue: serializeField(newValue) });
}

export async function listManagedDisciplines() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db.select().from(disciplines).orderBy(disciplines.name);
  return Promise.all(rows.map(async discipline => {
    const [courseLinks, contentLinks] = await Promise.all([
      db.select({ courseId: courseDisciplines.courseId }).from(courseDisciplines).where(eq(courseDisciplines.disciplineId, discipline.id)),
      db.select({ contentId: disciplineContents.contentId }).from(disciplineContents).where(eq(disciplineContents.disciplineId, discipline.id)),
    ]);
    return { ...discipline, courseIds: courseLinks.map(link => link.courseId), contentIds: contentLinks.map(link => link.contentId) };
  }));
}

async function getManagedDisciplineById(disciplineId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db.select().from(disciplines).where(eq(disciplines.id, disciplineId)).limit(1);
  return rows[0];
}

export async function createManagedDiscipline(actorUserId: number, input: DisciplineInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const shortName = input.shortName.trim().toUpperCase();
  const duplicate = await db.select({ id: disciplines.id }).from(disciplines).where(eq(disciplines.shortName, shortName)).limit(1);
  if (duplicate[0]) throw new Error("Já existe uma disciplina com esta sigla.");
  const result = await db.insert(disciplines).values({
    name: input.name.trim(), shortName, description: normalizeOptional(input.description),
    requiresReview: input.requiresReview, status: input.status ?? "draft", createdByUserId: actorUserId, updatedByUserId: actorUserId,
  });
  const disciplineId = Number(result[0].insertId);
  await syncCourseDisciplineLinks(actorUserId, disciplineId, input.courseIds ?? []);
  await syncDisciplineContentLinks(actorUserId, disciplineId, input.contentIds ?? []);
  await writeAdminAudit(actorUserId, null, "CRIACAO_DE_DISCIPLINA", `Disciplina ${shortName} criada.`);
  return getManagedDisciplineById(disciplineId);
}

export async function updateManagedDiscipline(actorUserId: number, disciplineId: number, input: DisciplineInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await getManagedDisciplineById(disciplineId);
  if (!existing) throw new Error("Disciplina não encontrada.");
  const shortName = input.shortName.trim().toUpperCase();
  const duplicate = await db.select({ id: disciplines.id }).from(disciplines).where(eq(disciplines.shortName, shortName)).limit(1);
  if (duplicate[0] && duplicate[0].id !== disciplineId) throw new Error("Já existe uma disciplina com esta sigla.");
  await db.update(disciplines).set({
    name: input.name.trim(), shortName, description: normalizeOptional(input.description), requiresReview: input.requiresReview,
    status: input.status ?? existing.status, updatedByUserId: actorUserId,
  }).where(eq(disciplines.id, disciplineId));
  await syncCourseDisciplineLinks(actorUserId, disciplineId, input.courseIds ?? []);
  await syncDisciplineContentLinks(actorUserId, disciplineId, input.contentIds ?? []);
  await writeAdminAudit(actorUserId, null, "ATUALIZACAO_DE_DISCIPLINA", `Disciplina ${shortName} atualizada.`);
  return getManagedDisciplineById(disciplineId);
}

export async function syncCourseDisciplineLinks(actorUserId: number, disciplineId: number, courseIds: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const requested = uniqueCourseIds(courseIds);
  for (const courseId of requested) {
    const course = await getManagedCourseById(courseId);
    if (!course) throw new Error(`Curso ${courseId} não encontrado.`);
  }
  const current = await db.select().from(courseDisciplines).where(eq(courseDisciplines.disciplineId, disciplineId));
  for (const link of current.filter(link => !requested.includes(link.courseId))) {
    await db.delete(courseDisciplines).where(eq(courseDisciplines.id, link.id));
  }
  for (const courseId of requested.filter(courseId => !current.some(link => link.courseId === courseId))) {
    await db.insert(courseDisciplines).values({ courseId, disciplineId, linkedByUserId: actorUserId });
  }
}

export async function syncDisciplineContentLinks(actorUserId: number, disciplineId: number, contentIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const requested = uniqueNumbers(contentIds);
  await assertExistingContentIds(requested);
  const current = await db.select().from(disciplineContents).where(eq(disciplineContents.disciplineId, disciplineId));
  for (const link of current.filter(link => !requested.includes(link.contentId))) {
    await db.delete(disciplineContents).where(eq(disciplineContents.id, link.id));
  }
  for (const contentId of requested.filter(contentId => !current.some(link => link.contentId === contentId))) {
    await db.insert(disciplineContents).values({ disciplineId, contentId, linkedByUserId: actorUserId });
  }
}

export async function listManagedContents() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db.select().from(contents).orderBy(desc(contents.updatedAt));
  return Promise.all(rows.map(async content => {
    const links = await db.select({ disciplineId: disciplineContents.disciplineId }).from(disciplineContents).where(eq(disciplineContents.contentId, content.id));
    return { ...content, disciplineIds: links.map(link => link.disciplineId) };
  }));
}

async function getManagedContentById(contentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db.select().from(contents).where(eq(contents.id, contentId)).limit(1);
  return rows[0];
}

export async function createManagedContent(actorUserId: number, input: ContentInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(contents).values({
    title: input.title.trim(), objective: normalizeOptional(input.objective), description: normalizeOptional(input.description), cardText: normalizeOptional(input.cardText), body: normalizeOptional(input.body), coverImageUrl: normalizeOptional(input.coverImageUrl), videoUrl: normalizeOptional(input.videoUrl), videoLabel: normalizeOptional(input.videoLabel), materialUrl: normalizeOptional(input.materialUrl), materialLabel: normalizeOptional(input.materialLabel),
    requiresReview: input.requiresReview, status: input.status === "review" ? "draft" : (input.status ?? "draft"), createdByUserId: actorUserId, updatedByUserId: actorUserId,
  });
  const contentId = Number(result[0].insertId);
  await syncContentDisciplineLinks(actorUserId, contentId, input.disciplineIds ?? []);
  await writeContentChange(contentId, actorUserId, "created", null, { title: input.title.trim() });
  await writeAdminAudit(actorUserId, null, "CRIACAO_DE_CONTEUDO", `Conteúdo ${contentId} criado.`);
  if (input.status === "review") await ensureItemInReviewQueue(actorUserId, "content", contentId);
  return getManagedContentById(contentId);
}

export async function updateManagedContent(actorUserId: number, contentId: number, input: ContentInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await getManagedContentById(contentId);
  if (!existing) throw new Error("Conteúdo não encontrado.");
  const next = {
    title: input.title.trim(), objective: normalizeOptional(input.objective), description: normalizeOptional(input.description), cardText: normalizeOptional(input.cardText), body: normalizeOptional(input.body), coverImageUrl: normalizeOptional(input.coverImageUrl), videoUrl: normalizeOptional(input.videoUrl), videoLabel: normalizeOptional(input.videoLabel), materialUrl: normalizeOptional(input.materialUrl), materialLabel: normalizeOptional(input.materialLabel),
    requiresReview: input.requiresReview, status: input.status ?? existing.status,
  };
  await db.update(contents).set({ ...next, updatedByUserId: actorUserId }).where(eq(contents.id, contentId));
  for (const field of Object.keys(next) as (keyof typeof next)[]) {
    if (valueChanged(existing[field], next[field])) await writeContentChange(contentId, actorUserId, field, existing[field], next[field]);
  }
  await syncContentDisciplineLinks(actorUserId, contentId, input.disciplineIds ?? []);
  await writeAdminAudit(actorUserId, null, "ATUALIZACAO_DE_CONTEUDO", `Conteúdo ${contentId} atualizado.`);
  if (input.status === "review") await ensureItemInReviewQueue(actorUserId, "content", contentId);
  return getManagedContentById(contentId);
}

export async function syncContentDisciplineLinks(actorUserId: number, contentId: number, disciplineIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const requested = uniqueNumbers(disciplineIds);
  for (const disciplineId of requested) {
    if (!await getManagedDisciplineById(disciplineId)) throw new Error(`Disciplina ${disciplineId} não encontrada.`);
  }
  const current = await db.select().from(disciplineContents).where(eq(disciplineContents.contentId, contentId));
  for (const link of current.filter(link => !requested.includes(link.disciplineId))) {
    await db.delete(disciplineContents).where(eq(disciplineContents.id, link.id));
    await writeContentChange(contentId, actorUserId, "disciplineLink", link.disciplineId, null);
  }
  for (const disciplineId of requested.filter(disciplineId => !current.some(link => link.disciplineId === disciplineId))) {
    await db.insert(disciplineContents).values({ disciplineId, contentId, linkedByUserId: actorUserId });
    await writeContentChange(contentId, actorUserId, "disciplineLink", null, disciplineId);
  }
}

export async function listManagedQuestions(input: { search?: string; status?: KnowledgeStatus; contentId?: number } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  let rows;
  if (input.status && input.search) rows = await db.select().from(questions).where(and(eq(questions.status, input.status), like(questions.statement, `%${input.search.trim()}%`))).orderBy(desc(questions.updatedAt));
  else if (input.status) rows = await db.select().from(questions).where(eq(questions.status, input.status)).orderBy(desc(questions.updatedAt));
  else if (input.search?.trim()) rows = await db.select().from(questions).where(like(questions.statement, `%${input.search.trim()}%`)).orderBy(desc(questions.updatedAt));
  else rows = await db.select().from(questions).orderBy(desc(questions.updatedAt));
  const enriched = await Promise.all(rows.map(async question => {
    const links = await db.select({ id: contents.id, title: contents.title, status: contents.status }).from(questionContentLinks).innerJoin(contents, eq(questionContentLinks.contentId, contents.id)).where(eq(questionContentLinks.questionId, question.id));
    return { ...question, contentIds: links.map(link => link.id), contents: links, options: question.optionsJson ? JSON.parse(question.optionsJson) : [], answer: JSON.parse(question.answerJson) };
  }));
  return input.contentId ? enriched.filter(question => question.contentIds.includes(input.contentId!)) : enriched;
}

/** Projeção para alunos: respeita o modo simples e a revisão configurável, sem duplicar a questão por conteúdo. */
export async function listStudyQuestions() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const allRows = await db.select().from(questions).orderBy(desc(questions.updatedAt));
  const rows = uniqueSimulationQuestions(allRows.filter(question => canUseQuestionInSimulation(question)));
  const studyQuestions = await Promise.all(rows.map(async question => {
    const linkedContents = await db.select({ id: contents.id, title: contents.title }).from(questionContentLinks).innerJoin(contents, eq(questionContentLinks.contentId, contents.id)).where(eq(questionContentLinks.questionId, question.id));
    const disciplineNames: string[] = [];
    for (const content of linkedContents) {
      const links = await db.select({ name: disciplines.name }).from(disciplineContents).innerJoin(disciplines, eq(disciplineContents.disciplineId, disciplines.id)).where(eq(disciplineContents.contentId, content.id));
      for (const link of links) if (!disciplineNames.includes(link.name)) disciplineNames.push(link.name);
    }
    return {
      id: question.id, statement: question.statement, questionType: question.questionType,
      options: question.optionsJson ? JSON.parse(question.optionsJson) : [], answer: JSON.parse(question.answerJson),
      explanation: question.explanation, difficulty: question.difficulty, source: question.source, banca: question.banca, year: question.year,
      discipline: disciplineNames[0] ?? "Biblioteca central", subject: linkedContents.map(content => content.title).join(" · ") || "Conteúdo geral",
      contentIds: linkedContents.map(content => content.id),
    };
  }));
  return { requiresReviewMode: requiresExclusiveCentralBank(allRows), questions: studyQuestions };
}

async function getManagedQuestionById(questionId: number) {
  const rows = await listManagedQuestions();
  return rows.find(question => question.id === questionId);
}

export async function createManagedQuestion(actorUserId: number, input: ManagedQuestionInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const result = await db.insert(questions).values({
    statement: input.statement.trim(), questionType: input.questionType, optionsJson: input.questionType === "multipla_escolha" ? JSON.stringify(input.options) : null,
    answerJson: JSON.stringify(input.answer), explanation: normalizeOptional(input.explanation), difficulty: input.difficulty,
    source: normalizeOptional(input.source), banca: normalizeOptional(input.banca), year: input.year ?? null,
    requiresReview: input.requiresReview, status: input.status === "review" ? "draft" : (input.status ?? "draft"), createdByUserId: actorUserId, updatedByUserId: actorUserId,
  });
  const questionId = Number(result[0].insertId);
  await writeQuestionChange(questionId, actorUserId, "created", null, { statement: input.statement.trim() });
  await syncQuestionContentLinks(actorUserId, questionId, input.contentIds);
  await writeAdminAudit(actorUserId, null, "CRIACAO_DE_QUESTAO", `Questão ${questionId} criada.`);
  if (input.status === "review") await ensureItemInReviewQueue(actorUserId, "question", questionId);
  const created = await getManagedQuestionById(questionId);
  if (!created) throw new Error("A questão foi criada, mas não pôde ser recuperada para confirmação.");
  return created;
}

export async function updateManagedQuestion(actorUserId: number, questionId: number, input: ManagedQuestionInput) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1);
  const previous = existing[0];
  if (!previous) throw new Error("Questão não encontrada.");
  const next = {
    statement: input.statement.trim(), questionType: input.questionType, optionsJson: input.questionType === "multipla_escolha" ? JSON.stringify(input.options) : null,
    answerJson: JSON.stringify(input.answer), explanation: normalizeOptional(input.explanation), difficulty: input.difficulty,
    source: normalizeOptional(input.source), banca: normalizeOptional(input.banca), year: input.year ?? null,
    requiresReview: input.requiresReview, status: input.status ?? previous.status,
  };
  await db.update(questions).set({ ...next, updatedByUserId: actorUserId }).where(eq(questions.id, questionId));
  for (const field of Object.keys(next) as (keyof typeof next)[]) {
    if (valueChanged(previous[field], next[field])) await writeQuestionChange(questionId, actorUserId, field, previous[field], next[field]);
  }
  await syncQuestionContentLinks(actorUserId, questionId, input.contentIds);
  await writeAdminAudit(actorUserId, null, "ATUALIZACAO_DE_QUESTAO", `Questão ${questionId} atualizada sem substituição do identificador.`);
  if (input.status === "review") await ensureItemInReviewQueue(actorUserId, "question", questionId);
  return getManagedQuestionById(questionId);
}

/** Exclui apenas questões que ainda não foram usadas em simulados, preservando a integridade do histórico estudantil. */
export async function deleteManagedQuestion(actorUserId: number, questionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const existing = await db.select({ id: questions.id, statement: questions.statement }).from(questions).where(eq(questions.id, questionId)).limit(1);
  if (!existing[0]) throw new Error("Questão não encontrada.");
  const simulationUse = await db.select({ id: simulationQuestions.id }).from(simulationQuestions).where(eq(simulationQuestions.questionId, questionId)).limit(1);
  if (simulationUse[0]) throw new Error("Esta questão já foi usada em um simulado e não pode ser excluída. Mude seu status para INATIVO para preservá-la no histórico.");

  await db.delete(reviewQueue).where(and(eq(reviewQueue.itemType, "question"), eq(reviewQueue.itemId, questionId)));
  await db.delete(questionChangelog).where(eq(questionChangelog.questionId, questionId));
  await db.delete(questionContentLinks).where(eq(questionContentLinks.questionId, questionId));
  await db.delete(questions).where(eq(questions.id, questionId));
  await writeAdminAudit(actorUserId, null, "EXCLUSAO_DE_QUESTAO", `Questão ${questionId} excluída antes de ser usada em simulado.`);
  return { id: questionId, statement: existing[0].statement };
}

export async function syncQuestionContentLinks(actorUserId: number, questionId: number, contentIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const requested = uniqueNumbers(contentIds);
  await assertExistingContentIds(requested);
  const current = await db.select().from(questionContentLinks).where(eq(questionContentLinks.questionId, questionId));
  for (const link of current.filter(link => !requested.includes(link.contentId))) {
    await db.delete(questionContentLinks).where(eq(questionContentLinks.id, link.id));
    await writeQuestionChange(questionId, actorUserId, "contentLink", link.contentId, null);
  }
  for (const contentId of requested.filter(contentId => !current.some(link => link.contentId === contentId))) {
    await db.insert(questionContentLinks).values({ questionId, contentId, linkedByUserId: actorUserId });
    await writeQuestionChange(questionId, actorUserId, "contentLink", null, contentId);
  }
}

export async function listQuestionChangelog(questionId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.select().from(questionChangelog).where(eq(questionChangelog.questionId, questionId)).orderBy(desc(questionChangelog.createdAt));
}

export async function listContentChangelog(contentId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  return db.select().from(contentChangelog).where(eq(contentChangelog.contentId, contentId)).orderBy(desc(contentChangelog.createdAt));
}

async function ensureItemInReviewQueue(actorUserId: number, itemType: ReviewItemType, itemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const pending = await db.select({ id: reviewQueue.id }).from(reviewQueue).where(and(eq(reviewQueue.itemType, itemType), eq(reviewQueue.itemId, itemId), eq(reviewQueue.status, "pending"))).limit(1);
  if (!pending[0]) await submitForReview(actorUserId, itemType, itemId);
}

export async function submitForReview(actorUserId: number, itemType: ReviewItemType, itemId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const pending = await db.select({ id: reviewQueue.id }).from(reviewQueue).where(and(eq(reviewQueue.itemType, itemType), eq(reviewQueue.itemId, itemId), eq(reviewQueue.status, "pending"))).limit(1);
  if (pending[0]) throw new Error("Este item já está na fila de revisão.");
  if (itemType === "question") {
    const item = await db.select().from(questions).where(eq(questions.id, itemId)).limit(1);
    if (!item[0]) throw new Error("Questão não encontrada.");
    await db.update(questions).set({ status: "review", updatedByUserId: actorUserId }).where(eq(questions.id, itemId));
    await writeQuestionChange(itemId, actorUserId, "status", item[0].status, "review");
  } else {
    const item = await db.select().from(contents).where(eq(contents.id, itemId)).limit(1);
    if (!item[0]) throw new Error("Conteúdo não encontrado.");
    await db.update(contents).set({ status: "review", updatedByUserId: actorUserId }).where(eq(contents.id, itemId));
    await writeContentChange(itemId, actorUserId, "status", item[0].status, "review");
  }
  await db.insert(reviewQueue).values({ itemType, itemId, submittedByUserId: actorUserId, status: "pending" });
  await writeAdminAudit(actorUserId, null, "ENVIO_PARA_REVISAO", `${itemType === "question" ? "Questão" : "Conteúdo"} ${itemId} enviado para revisão.`);
  return { success: true };
}

export async function listReviewQueue(input: { itemType?: ReviewItemType; status?: "pending" | ReviewDecision; search?: string } = {}) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  let rows;
  if (input.itemType && input.status) rows = await db.select().from(reviewQueue).where(and(eq(reviewQueue.itemType, input.itemType), eq(reviewQueue.status, input.status))).orderBy(desc(reviewQueue.createdAt));
  else if (input.itemType) rows = await db.select().from(reviewQueue).where(eq(reviewQueue.itemType, input.itemType)).orderBy(desc(reviewQueue.createdAt));
  else if (input.status) rows = await db.select().from(reviewQueue).where(eq(reviewQueue.status, input.status)).orderBy(desc(reviewQueue.createdAt));
  else rows = await db.select().from(reviewQueue).orderBy(desc(reviewQueue.createdAt));
  const enriched = await Promise.all(rows.map(async row => {
    if (row.itemType === "question") {
      const item = await db.select({ statement: questions.statement, status: questions.status }).from(questions).where(eq(questions.id, row.itemId)).limit(1);
      return { ...row, title: item[0]?.statement ?? `Questão removida #${row.itemId}`, itemStatus: item[0]?.status ?? "inactive" };
    }
    const item = await db.select({ title: contents.title, status: contents.status }).from(contents).where(eq(contents.id, row.itemId)).limit(1);
    return { ...row, title: item[0]?.title ?? `Conteúdo removido #${row.itemId}`, itemStatus: item[0]?.status ?? "inactive" };
  }));
  const term = input.search?.trim().toLowerCase();
  return term ? enriched.filter(item => item.title.toLowerCase().includes(term)) : enriched;
}

export async function getReviewPendingCount() {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const rows = await db.select({ count: sql<number>`count(*)` }).from(reviewQueue).where(eq(reviewQueue.status, "pending"));
  return Number(rows[0]?.count ?? 0);
}

export async function decideReview(actorUserId: number, reviewId: number, decision: ReviewDecision, notes?: string | null) {
  const db = await getDb();
  if (!db) throw new Error("Banco de dados indisponível");
  const review = await db.select().from(reviewQueue).where(eq(reviewQueue.id, reviewId)).limit(1);
  if (!review[0]) throw new Error("Item de revisão não encontrado.");
  if (review[0].status !== "pending") throw new Error("Esta revisão já recebeu uma decisão.");
  const nextStatus: KnowledgeStatus = decision === "approved" ? "approved" : "draft";
  if (review[0].itemType === "question") {
    const item = await db.select().from(questions).where(eq(questions.id, review[0].itemId)).limit(1);
    if (!item[0]) throw new Error("Questão não encontrada.");
    await db.update(questions).set({ status: nextStatus, updatedByUserId: actorUserId }).where(eq(questions.id, review[0].itemId));
    await writeQuestionChange(review[0].itemId, actorUserId, "reviewDecision", item[0].status, nextStatus);
  } else {
    const item = await db.select().from(contents).where(eq(contents.id, review[0].itemId)).limit(1);
    if (!item[0]) throw new Error("Conteúdo não encontrado.");
    await db.update(contents).set({ status: nextStatus, updatedByUserId: actorUserId }).where(eq(contents.id, review[0].itemId));
    await writeContentChange(review[0].itemId, actorUserId, "reviewDecision", item[0].status, nextStatus);
  }
  await persistReviewDecision({ find: async id => id === reviewId ? review[0] : null, update: async (id, changes) => { await db.update(reviewQueue).set(changes).where(eq(reviewQueue.id, id)); } }, reviewId, actorUserId, decision as PersistedReviewDecision, normalizeOptional(notes));
  await writeAdminAudit(actorUserId, null, "DECISAO_DE_REVISAO", `Revisão ${reviewId} concluída como ${decision}.`);
  return { success: true, status: decision };
}
