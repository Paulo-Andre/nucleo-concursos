import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, enrollmentRequiredProcedure, protectedProcedure, publicProcedure, router } from "./_core/trpc";
import {
  completeStudyModule,
  createManagedContent,
  createManagedCourse,
  createManagedDiscipline,
  createManagedQuestion,
  deleteManagedQuestion,
  createLocalUser,
  deleteManagedCourse,
  createSession,
  deleteManagedUser,
  deleteSessionByHash,
  getAdminStats,
  getReviewPendingCount,
  getStudyState,
  getUserCourseAccess,
  grantCourseEnrollment,
  getUserByIdentifier,
  getUserByUsername,
  listAdminAuditLogs,
  listContentChangelog,
  listManagedCourses,
  listManagedContents,
  listManagedDisciplines,
  listManagedQuestions,
  listStudyQuestions,
  listManagedUsers,
  listQuestionChangelog,
  listReviewQueue,
  listStudyReviewItems,
  listUserEnrollments,
  completeStudyReviewItem,
  recordAnswer,
  recordSimulation,
  removeStudyReviewItem,
  saveNote,
  saveStudyReviewItem,
  setUserBlocked,
  setManagedCourseActive,
  updateManagedUser,
  updateManagedContent,
  updateManagedDiscipline,
  updateManagedQuestion,
  updateUserPassword,
  updateUserProfile,
  writeAdminAudit,
  submitForReview,
  decideReview,
} from "./db";
import { createSessionToken, hashPassword, hashSessionToken, LOCAL_SESSION_COOKIE, LOCAL_SESSION_MAX_AGE_MS, verifyPassword } from "./auth/localAuth";
import { hasRootBootstrapSecret } from "./auth/rootConfig";

const usernameSchema = z.string().trim().toLowerCase().min(3, "Use ao menos 3 caracteres.").max(48).regex(/^[a-z0-9._-]+$/, "Use apenas letras minúsculas, números, ponto, hífen ou sublinhado.");
const passwordSchema = z.string().min(8, "A senha deve ter pelo menos 8 caracteres.").max(128);
const profileSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome completo.").max(160),
  username: usernameSchema,
  email: z.string().trim().toLowerCase().email("Informe um e-mail válido.").max(320),
});
const metricSchema = z.record(z.string(), z.object({ correct: z.number().int().nonnegative(), total: z.number().int().nonnegative() }));
const studyReviewSnapshotSchema = z.object({
  statement: z.string().trim().min(1).max(12000),
  answer: z.boolean(),
  explanation: z.string().trim().min(1).max(12000),
  discipline: z.string().trim().min(1).max(160),
  subject: z.string().trim().min(1).max(240),
  source: z.string().trim().max(400).optional(),
});
const enrollmentSchema = z.object({
  userId: z.number().int().positive(),
  courseId: z.string().trim().min(1).max(80),
  startAt: z.coerce.date(),
  expiresAt: z.coerce.date(),
}).refine(input => input.expiresAt > input.startAt, { message: "A data de vencimento deve ser posterior ao início.", path: ["expiresAt"] });
const courseIdSchema = z.string().trim().toLowerCase().min(3, "Use ao menos 3 caracteres.").max(80).regex(/^[a-z0-9._-]+$/, "Use letras minúsculas, números, ponto, hífen ou sublinhado.");
const courseSchema = z.object({
  id: courseIdSchema,
  title: z.string().trim().min(4, "Informe o título do curso.").max(180),
  track: z.string().trim().min(2, "Informe a trilha do curso.").max(32),
  description: z.string().trim().max(1200).optional(),
});
const knowledgeStatusSchema = z.enum(["draft", "review", "approved", "published", "inactive"]);
const questionTypeSchema = z.enum(["certo_errado", "multipla_escolha"]);
const difficultySchema = z.enum(["basic", "intermediate", "advanced"]);
const entityIdSchema = z.number().int().positive();
const contentSchema = z.object({
  title: z.string().trim().min(4, "Informe o título do conteúdo.").max(220),
  objective: z.string().trim().max(4000).optional(),
  description: z.string().trim().max(4000).optional(),
  cardText: z.string().trim().max(1200).optional(),
  body: z.string().trim().max(30000).optional(),
  videoUrl: z.string().trim().url("Informe uma URL de vídeo válida.").max(2048).optional().or(z.literal("")),
  videoLabel: z.string().trim().max(160).optional(),
  materialUrl: z.string().trim().url("Informe uma URL de material válida.").max(2048).optional().or(z.literal("")),
  materialLabel: z.string().trim().max(160).optional(),
  requiresReview: z.boolean().default(false),
  status: knowledgeStatusSchema.optional(),
  disciplineIds: z.array(entityIdSchema).max(100).default([]),
});
const disciplineSchema = z.object({
  name: z.string().trim().min(3, "Informe o nome da disciplina.").max(160),
  shortName: z.string().trim().min(2, "Informe a sigla.").max(48),
  description: z.string().trim().max(4000).optional(),
  requiresReview: z.boolean().default(false),
  status: knowledgeStatusSchema.optional(),
  courseIds: z.array(courseIdSchema).max(100).default([]),
  contentIds: z.array(entityIdSchema).max(500).default([]),
});
const questionSchema = z.object({
  statement: z.string().trim().min(12, "Informe o enunciado da questão.").max(20000),
  questionType: questionTypeSchema,
  options: z.array(z.string().trim().min(1).max(1000)).max(10).default([]),
  answer: z.union([z.boolean(), z.string().trim().min(1).max(1000)]),
  explanation: z.string().trim().max(12000).optional(),
  difficulty: difficultySchema.default("intermediate"),
  source: z.string().trim().max(240).optional(),
  banca: z.string().trim().max(120).optional(),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
  requiresReview: z.boolean().default(false),
  status: knowledgeStatusSchema.optional(),
  contentIds: z.array(entityIdSchema).max(100).default([]),
}).superRefine((input, context) => {
  if (input.questionType === "certo_errado" && typeof input.answer !== "boolean") context.addIssue({ code: "custom", path: ["answer"], message: "Questões CERTO/ERRADO exigem resposta booleana." });
  if (input.questionType === "multipla_escolha" && (typeof input.answer !== "string" || !input.options.includes(input.answer))) context.addIssue({ code: "custom", path: ["answer"], message: "Selecione uma alternativa cadastrada como resposta." });
});

function safeUser(user: NonNullable<Parameters<typeof getStudyState>[0]> extends never ? never : any) {
  return {
    id: user.id,
    name: user.name,
    username: user.username,
    email: user.email,
    role: user.role,
    isBlocked: user.isBlocked,
    createdAt: user.createdAt,
    lastSignedIn: user.lastSignedIn,
  };
}

function invalidCredentials() {
  return new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha inválidos." });
}

async function startLocalSession(ctx: { req: any; res: any }, userId: number) {
  const token = createSessionToken();
  await createSession(userId, crypto.randomUUID(), hashSessionToken(token), new Date(Date.now() + LOCAL_SESSION_MAX_AGE_MS));
  const options = getSessionCookieOptions(ctx.req);
  ctx.res.cookie(LOCAL_SESSION_COOKIE, token, { ...options, maxAge: LOCAL_SESSION_MAX_AGE_MS });
}

function clearAllAuthCookies(ctx: { req: any; res: any }) {
  const options = getSessionCookieOptions(ctx.req);
  ctx.res.clearCookie(LOCAL_SESSION_COOKIE, { ...options, maxAge: -1 });
  ctx.res.clearCookie(COOKIE_NAME, { ...options, maxAge: -1 });
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => (ctx.user ? safeUser(ctx.user) : null)),
    bootstrapStatus: publicProcedure.query(() => ({ rootBootstrapReady: hasRootBootstrapSecret() })),
    register: publicProcedure.input(profileSchema.extend({ password: passwordSchema, passwordConfirmation: passwordSchema })).mutation(async ({ input, ctx }) => {
      if (input.password !== input.passwordConfirmation) throw new TRPCError({ code: "BAD_REQUEST", message: "A confirmação de senha não confere." });
      const duplicate = await getUserByIdentifier(input.username) ?? await getUserByIdentifier(input.email);
      if (duplicate) throw new TRPCError({ code: "CONFLICT", message: "Usuário ou e-mail já está em uso." });
      const user = await createLocalUser({ ...input, passwordHash: await hashPassword(input.password) });
      await startLocalSession(ctx, user.id);
      return safeUser(user);
    }),
    login: publicProcedure.input(z.object({ identifier: z.string().trim().min(3), password: passwordSchema })).mutation(async ({ input, ctx }) => {
      const user = await getUserByIdentifier(input.identifier);
      if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) throw invalidCredentials();
      if (user.isBlocked) throw new TRPCError({ code: "FORBIDDEN", message: "Esta conta está bloqueada. Procure a administração." });
      await startLocalSession(ctx, user.id);
      return safeUser(user);
    }),
    logout: publicProcedure.mutation(async ({ ctx }) => {
      const token = ctx.req.headers.cookie?.match(new RegExp(`${LOCAL_SESSION_COOKIE}=([^;]+)`))?.[1];
      if (token) await deleteSessionByHash(hashSessionToken(token));
      clearAllAuthCookies(ctx);
      return { success: true } as const;
    }),
    changePassword: protectedProcedure.input(z.object({ currentPassword: passwordSchema, newPassword: passwordSchema, confirmation: passwordSchema })).mutation(async ({ input, ctx }) => {
      if (input.newPassword !== input.confirmation) throw new TRPCError({ code: "BAD_REQUEST", message: "A confirmação de senha não confere." });
      if (!ctx.user.passwordHash || !(await verifyPassword(input.currentPassword, ctx.user.passwordHash))) throw new TRPCError({ code: "FORBIDDEN", message: "A senha atual não confere." });
      await updateUserPassword(ctx.user.id, await hashPassword(input.newPassword));
      return { success: true };
    }),
    updateProfile: protectedProcedure.input(profileSchema).mutation(async ({ input, ctx }) => {
      const user = await updateUserProfile(ctx.user.id, input);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Conta não encontrada." });
      return safeUser(user);
    }),
  }),
  study: router({
    state: enrollmentRequiredProcedure.query(({ ctx }) => getStudyState(ctx.user.id)),
    access: protectedProcedure.query(({ ctx }) => getUserCourseAccess(ctx.user.id)),
    answer: enrollmentRequiredProcedure.input(z.object({ questionId: z.string().trim().min(1).max(80), correct: z.boolean() })).mutation(({ input, ctx }) => recordAnswer(ctx.user.id, input.questionId, input.correct)),
    completeModule: enrollmentRequiredProcedure.input(z.object({ moduleId: z.string().trim().min(1).max(80) })).mutation(({ input, ctx }) => completeStudyModule(ctx.user.id, input.moduleId)),
    submitSimulation: enrollmentRequiredProcedure.input(z.object({
      id: z.string().min(1).max(64), total: z.number().int().positive(), correct: z.number().int().nonnegative(), errors: z.number().int().nonnegative(), elapsedSeconds: z.number().int().nonnegative(),
      byDiscipline: metricSchema, byBlock: metricSchema,
      answers: z.array(z.object({ questionId: z.string().min(1).max(80), correct: z.boolean() })),
      questionIds: z.array(z.string().min(1).max(80)),
      persistentAnswers: z.array(z.object({ questionId: entityIdSchema, correct: z.boolean(), snapshot: z.record(z.string(), z.unknown()) })).optional(),
    })).mutation(({ input, ctx }) => recordSimulation(ctx.user.id, input)),
    questions: router({
      list: enrollmentRequiredProcedure.query(() => listStudyQuestions()),
    }),
    review: router({
      list: enrollmentRequiredProcedure.query(({ ctx }) => listStudyReviewItems(ctx.user.id)),
      add: enrollmentRequiredProcedure.input(z.object({ questionKey: z.string().trim().min(1).max(80), snapshot: studyReviewSnapshotSchema })).mutation(({ input, ctx }) => saveStudyReviewItem(ctx.user.id, input)),
      complete: enrollmentRequiredProcedure.input(z.object({ id: entityIdSchema })).mutation(({ input, ctx }) => completeStudyReviewItem(ctx.user.id, input.id)),
      remove: enrollmentRequiredProcedure.input(z.object({ id: entityIdSchema })).mutation(({ input, ctx }) => removeStudyReviewItem(ctx.user.id, input.id)),
    }),
    note: enrollmentRequiredProcedure.input(z.object({ moduleId: z.string().trim().min(1).max(80) })).query(({ input, ctx }) => import("./db").then(({ getNote }) => getNote(ctx.user.id, input.moduleId))),
    saveNote: enrollmentRequiredProcedure.input(z.object({ moduleId: z.string().trim().min(1).max(80), content: z.string().trim().max(12000) })).mutation(({ input, ctx }) => saveNote(ctx.user.id, input.moduleId, input.content)),
  }),
  admin: router({
    users: adminProcedure.input(z.object({ search: z.string().trim().max(80).optional() })).query(({ input }) => listManagedUsers(input.search)),
    stats: adminProcedure.query(() => getAdminStats()),
    courses: adminProcedure.query(() => listManagedCourses()),
    createCourse: adminProcedure.input(courseSchema).mutation(({ input, ctx }) => createManagedCourse(ctx.user.id, input)),
    setCourseActive: adminProcedure.input(z.object({ courseId: courseIdSchema, isActive: z.boolean() })).mutation(({ input, ctx }) => setManagedCourseActive(ctx.user.id, input.courseId, input.isActive)),
    deleteCourse: adminProcedure.input(z.object({ courseId: courseIdSchema, confirmation: courseIdSchema })).mutation(({ input, ctx }) => deleteManagedCourse(ctx.user.id, input.courseId, input.confirmation)),
    disciplines: router({
      list: adminProcedure.query(() => listManagedDisciplines()),
      create: adminProcedure.input(disciplineSchema).mutation(({ input, ctx }) => createManagedDiscipline(ctx.user.id, input)),
      update: adminProcedure.input(z.object({ id: entityIdSchema, data: disciplineSchema })).mutation(({ input, ctx }) => updateManagedDiscipline(ctx.user.id, input.id, input.data)),
    }),
    contents: router({
      list: adminProcedure.query(() => listManagedContents()),
      create: adminProcedure.input(contentSchema).mutation(({ input, ctx }) => createManagedContent(ctx.user.id, input)),
      update: adminProcedure.input(z.object({ id: entityIdSchema, data: contentSchema })).mutation(({ input, ctx }) => updateManagedContent(ctx.user.id, input.id, input.data)),
      changelog: adminProcedure.input(z.object({ id: entityIdSchema })).query(({ input }) => listContentChangelog(input.id)),
      sendToReview: adminProcedure.input(z.object({ id: entityIdSchema })).mutation(({ input, ctx }) => submitForReview(ctx.user.id, "content", input.id)),
    }),
    questions: router({
      list: adminProcedure.input(z.object({ search: z.string().trim().max(200).optional(), status: knowledgeStatusSchema.optional(), contentId: entityIdSchema.optional() })).query(({ input }) => listManagedQuestions(input)),
      create: adminProcedure.input(questionSchema).mutation(({ input, ctx }) => createManagedQuestion(ctx.user.id, input)),
      update: adminProcedure.input(z.object({ id: entityIdSchema, data: questionSchema })).mutation(({ input, ctx }) => updateManagedQuestion(ctx.user.id, input.id, input.data)),
      remove: adminProcedure.input(z.object({ id: entityIdSchema })).mutation(({ input, ctx }) => deleteManagedQuestion(ctx.user.id, input.id)),
      changelog: adminProcedure.input(z.object({ id: entityIdSchema })).query(({ input }) => listQuestionChangelog(input.id)),
      sendToReview: adminProcedure.input(z.object({ id: entityIdSchema })).mutation(({ input, ctx }) => submitForReview(ctx.user.id, "question", input.id)),
    }),
    review: router({
      pendingCount: adminProcedure.query(() => getReviewPendingCount()),
      list: adminProcedure.input(z.object({ itemType: z.enum(["question", "content"]).optional(), status: z.enum(["pending", "approved", "rejected", "correction_requested"]).optional(), search: z.string().trim().max(200).optional() })).query(({ input }) => listReviewQueue(input)),
      decide: adminProcedure.input(z.object({ id: entityIdSchema, decision: z.enum(["approved", "rejected", "correction_requested"]), notes: z.string().trim().max(4000).optional() }).refine(input => input.decision === "approved" || (input.notes?.trim().length ?? 0) >= 5, { message: "Explique a rejeição ou a correção solicitada em ao menos 5 caracteres.", path: ["notes"] })).mutation(({ input, ctx }) => decideReview(ctx.user.id, input.id, input.decision, input.notes)),
    }),
    auditLogs: adminProcedure.query(() => listAdminAuditLogs()),
    enrollments: adminProcedure.input(z.object({ userId: z.number().int().positive() })).query(({ input }) => listUserEnrollments(input.userId)),
    grantEnrollment: adminProcedure.input(enrollmentSchema).mutation(async ({ input, ctx }) => grantCourseEnrollment(ctx.user.id, input.userId, input.courseId, input.startAt, input.expiresAt)),
    revokeEnrollment: adminProcedure.input(z.object({ userId: z.number().int().positive(), courseId: z.string().trim().min(1).max(80) })).mutation(({ input, ctx }) => import("./db").then(({ revokeCourseEnrollment }) => revokeCourseEnrollment(ctx.user.id, input.userId, input.courseId))),
    updateUser: adminProcedure.input(z.object({ userId: z.number().int().positive(), profile: profileSchema })).mutation(async ({ input, ctx }) => {
      const user = await updateManagedUser(input.userId, input.profile);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "Conta não encontrada." });
      await writeAdminAudit(ctx.user.id, input.userId, "ATUALIZACAO_DE_CONTA", `Dados básicos atualizados para ${user.username ?? user.name}.`);
      return safeUser(user);
    }),
    resetPassword: adminProcedure.input(z.object({ userId: z.number().int().positive(), newPassword: passwordSchema, confirmation: passwordSchema })).mutation(async ({ input, ctx }) => {
      if (input.newPassword !== input.confirmation) throw new TRPCError({ code: "BAD_REQUEST", message: "A confirmação de senha não confere." });
      await updateUserPassword(input.userId, await hashPassword(input.newPassword));
      await writeAdminAudit(ctx.user.id, input.userId, "REDEFINICAO_DE_SENHA", "Senha redefinida pelo administrador sem exposição da credencial anterior.");
      return { success: true };
    }),
    setBlocked: adminProcedure.input(z.object({ userId: z.number().int().positive(), isBlocked: z.boolean() })).mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "A conta administrativa não pode bloquear a si mesma." });
      await setUserBlocked(input.userId, input.isBlocked);
      await writeAdminAudit(ctx.user.id, input.userId, input.isBlocked ? "BLOQUEIO_DE_CONTA" : "DESBLOQUEIO_DE_CONTA", input.isBlocked ? "Conta bloqueada." : "Conta desbloqueada.");
      return { success: true };
    }),
    deleteUser: adminProcedure.input(z.object({ userId: z.number().int().positive(), confirmationUsername: usernameSchema })).mutation(async ({ input, ctx }) => {
      if (input.userId === ctx.user.id) throw new TRPCError({ code: "BAD_REQUEST", message: "A conta administrativa não pode excluir a si mesma." });
      const target = await getUserByUsername(input.confirmationUsername);
      if (!target || target.id !== input.userId) throw new TRPCError({ code: "BAD_REQUEST", message: "Confirmação de usuário inválida." });
      await writeAdminAudit(ctx.user.id, input.userId, "EXCLUSAO_DE_CONTA", `Conta ${target.username ?? target.name} excluída pelo administrador.`);
      await deleteManagedUser(input.userId);
      return { success: true };
    }),
  }),
});

export type AppRouter = typeof appRouter;
