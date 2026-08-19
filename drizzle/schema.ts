import { boolean, index, int, mysqlEnum, mysqlTable, text, timestamp, uniqueIndex, varchar } from "drizzle-orm/mysql-core";

/**
 * Identidade principal da plataforma. Contas locais usam openId no formato
 * `local:<nomeDeUsuario>`; contas OAuth continuam compatíveis com o modelo do template.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  username: varchar("username", { length: 48 }).unique(),
  email: varchar("email", { length: 320 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  loginMethod: varchar("loginMethod", { length: 64 }).notNull().default("local"),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  isBlocked: boolean("isBlocked").notNull().default(false),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

/** Sessões opacas: somente o hash do token é persistido. */
export const authSessions = mysqlTable("authSessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("authSessions_userId_idx").on(table.userId), index("authSessions_expiresAt_idx").on(table.expiresAt)]);

/** Estado agregado necessário para XP, sequência e seleção de questões do estudante. */
export const studyProfiles = mysqlTable("studyProfiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  xp: int("xp").notNull().default(0),
  lastStudyDate: varchar("lastStudyDate", { length: 10 }),
  studyDatesJson: text("studyDatesJson").notNull(),
  usedQuestionIdsJson: text("usedQuestionIdsJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("studyProfiles_userId_unique").on(table.userId)]);

/** Módulos concluídos — uma linha por estudante e módulo. */
export const completedModules = mysqlTable("completedModules", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  moduleId: varchar("moduleId", { length: 80 }).notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
}, table => [uniqueIndex("completedModules_user_module_unique").on(table.userId, table.moduleId), index("completedModules_userId_idx").on(table.userId)]);

/** Histórico de respostas, associado exclusivamente ao estudante que respondeu. */
export const studyAnswers = mysqlTable("studyAnswers", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  questionId: varchar("questionId", { length: 80 }).notNull(),
  correct: boolean("correct").notNull(),
  answeredAt: timestamp("answeredAt").defaultNow().notNull(),
}, table => [index("studyAnswers_userId_idx").on(table.userId), index("studyAnswers_user_question_idx").on(table.userId, table.questionId)]);

/** Resultados de simulados, com recortes por disciplina e bloco serializados em JSON. */
export const simulationRecords = mysqlTable("simulationRecords", {
  id: varchar("id", { length: 64 }).primaryKey(),
  userId: int("userId").notNull(),
  completedAt: timestamp("completedAt").defaultNow().notNull(),
  total: int("total").notNull(),
  correct: int("correct").notNull(),
  errors: int("errors").notNull(),
  elapsedSeconds: int("elapsedSeconds").notNull(),
  byDisciplineJson: text("byDisciplineJson").notNull(),
  byBlockJson: text("byBlockJson").notNull(),
}, table => [index("simulationRecords_userId_idx").on(table.userId)]);

/** Anotações privadas do estudante por módulo. */
export const studyNotes = mysqlTable("studyNotes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  moduleId: varchar("moduleId", { length: 80 }).notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [uniqueIndex("studyNotes_user_module_unique").on(table.userId, table.moduleId), index("studyNotes_userId_idx").on(table.userId)]);

/** Registro imutável das ações administrativas relevantes. */
export const adminAuditLogs = mysqlTable("adminAuditLogs", {
  id: int("id").autoincrement().primaryKey(),
  actorUserId: int("actorUserId").notNull(),
  affectedUserId: int("affectedUserId"),
  action: varchar("action", { length: 80 }).notNull(),
  detail: text("detail").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("adminAudit_actor_idx").on(table.actorUserId), index("adminAudit_affected_idx").on(table.affectedUserId)]);

/** Cursos administráveis, associados às matrizes reutilizáveis de conteúdo. */
export const courses = mysqlTable("courses", {
  id: varchar("id", { length: 80 }).primaryKey(),
  title: varchar("title", { length: 180 }).notNull(),
  track: varchar("track", { length: 32 }).notNull(),
  description: text("description"),
  isActive: boolean("isActive").notNull().default(true),
  createdByUserId: int("createdByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("courses_active_idx").on(table.isActive)]);

/** Matrícula individual: uma conta pode ter cursos diferentes e renová-los por período. */
export const courseEnrollments = mysqlTable("courseEnrollments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  courseId: varchar("courseId", { length: 80 }).notNull(),
  startAt: timestamp("startAt").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  status: mysqlEnum("status", ["active", "revoked"]).notNull().default("active"),
  createdByUserId: int("createdByUserId").notNull(),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  uniqueIndex("courseEnrollments_user_course_unique").on(table.userId, table.courseId),
  index("courseEnrollments_user_idx").on(table.userId),
  index("courseEnrollments_expiry_idx").on(table.expiresAt),
]);

/** Disciplinas independentes e reutilizáveis por uma ou mais matrizes de curso. */
export const disciplines = mysqlTable("disciplines", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  shortName: varchar("shortName", { length: 48 }).notNull().unique(),
  description: text("description"),
  status: mysqlEnum("status", ["draft", "review", "approved", "published", "inactive"]).notNull().default("draft"),
  requiresReview: boolean("requiresReview").notNull().default(false),
  createdByUserId: int("createdByUserId").notNull(),
  updatedByUserId: int("updatedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("disciplines_status_idx").on(table.status)]);

/** Conteúdos didáticos reutilizáveis. A associação às disciplinas ocorre pela tabela de vínculos. */
export const contents = mysqlTable("contents", {
  id: int("id").autoincrement().primaryKey(),
  title: varchar("title", { length: 220 }).notNull(),
  description: text("description"),
  body: text("body"),
  status: mysqlEnum("status", ["draft", "review", "approved", "published", "inactive"]).notNull().default("draft"),
  requiresReview: boolean("requiresReview").notNull().default(false),
  createdByUserId: int("createdByUserId").notNull(),
  updatedByUserId: int("updatedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [index("contents_status_idx").on(table.status), index("contents_title_idx").on(table.title)]);

/** Questão canônica: a edição mantém o mesmo id e não altera o histórico de tentativas anteriores. */
export const questions = mysqlTable("questions", {
  id: int("id").autoincrement().primaryKey(),
  statement: text("statement").notNull(),
  questionType: mysqlEnum("questionType", ["certo_errado", "multipla_escolha"]).notNull().default("certo_errado"),
  optionsJson: text("optionsJson"),
  answerJson: text("answerJson").notNull(),
  explanation: text("explanation"),
  difficulty: mysqlEnum("difficulty", ["basic", "intermediate", "advanced"]).notNull().default("intermediate"),
  source: varchar("source", { length: 240 }),
  banca: varchar("banca", { length: 120 }),
  year: int("year"),
  status: mysqlEnum("status", ["draft", "review", "approved", "published", "inactive"]).notNull().default("draft"),
  requiresReview: boolean("requiresReview").notNull().default(false),
  createdByUserId: int("createdByUserId").notNull(),
  updatedByUserId: int("updatedByUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("questions_status_idx").on(table.status),
  index("questions_review_idx").on(table.requiresReview, table.status),
  index("questions_banca_year_idx").on(table.banca, table.year),
]);

/** Curso → disciplina: vínculo reutilizável, com autoria e data. */
export const courseDisciplines = mysqlTable("courseDisciplines", {
  id: int("id").autoincrement().primaryKey(),
  courseId: varchar("courseId", { length: 80 }).notNull(),
  disciplineId: int("disciplineId").notNull(),
  linkedByUserId: int("linkedByUserId").notNull(),
  linkedAt: timestamp("linkedAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("courseDisciplines_course_discipline_unique").on(table.courseId, table.disciplineId),
  index("courseDisciplines_discipline_idx").on(table.disciplineId),
]);

/** Disciplina → conteúdo: vínculo reutilizável, com autoria e data. */
export const disciplineContents = mysqlTable("disciplineContents", {
  id: int("id").autoincrement().primaryKey(),
  disciplineId: int("disciplineId").notNull(),
  contentId: int("contentId").notNull(),
  linkedByUserId: int("linkedByUserId").notNull(),
  linkedAt: timestamp("linkedAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("disciplineContents_discipline_content_unique").on(table.disciplineId, table.contentId),
  index("disciplineContents_content_idx").on(table.contentId),
]);

/** Questão → conteúdo: associação N:N que registra a autoria e o momento do vínculo. */
export const questionContentLinks = mysqlTable("questionContentLinks", {
  id: int("id").autoincrement().primaryKey(),
  questionId: int("questionId").notNull(),
  contentId: int("contentId").notNull(),
  linkedByUserId: int("linkedByUserId").notNull(),
  linkedAt: timestamp("linkedAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("questionContentLinks_question_content_unique").on(table.questionId, table.contentId),
  index("questionContentLinks_content_idx").on(table.contentId),
]);

/** Instantâneo de uma questão persistente usada em um simulado já concluído. */
export const simulationQuestions = mysqlTable("simulationQuestions", {
  id: int("id").autoincrement().primaryKey(),
  simulationId: varchar("simulationId", { length: 64 }).notNull(),
  questionId: int("questionId").notNull(),
  position: int("position").notNull(),
  answeredCorrectly: boolean("answeredCorrectly"),
  snapshotJson: text("snapshotJson").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [
  uniqueIndex("simulationQuestions_simulation_position_unique").on(table.simulationId, table.position),
  uniqueIndex("simulationQuestions_simulation_question_unique").on(table.simulationId, table.questionId),
  index("simulationQuestions_question_idx").on(table.questionId),
]);

/** Uma solicitação por envio para revisão; novos envios preservam as decisões anteriores. */
export const reviewQueue = mysqlTable("reviewQueue", {
  id: int("id").autoincrement().primaryKey(),
  itemType: mysqlEnum("itemType", ["question", "content"]).notNull(),
  itemId: int("itemId").notNull(),
  status: mysqlEnum("status", ["pending", "approved", "rejected", "correction_requested"]).notNull().default("pending"),
  submittedByUserId: int("submittedByUserId").notNull(),
  reviewedByUserId: int("reviewedByUserId"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, table => [
  index("reviewQueue_pending_idx").on(table.status, table.itemType),
  index("reviewQueue_item_idx").on(table.itemType, table.itemId),
]);

/** Histórico por campo da questão, inclusive alterações de metadados e status. */
export const questionChangelog = mysqlTable("questionChangelog", {
  id: int("id").autoincrement().primaryKey(),
  questionId: int("questionId").notNull(),
  actorUserId: int("actorUserId").notNull(),
  changedField: varchar("changedField", { length: 80 }).notNull(),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("questionChangelog_question_idx").on(table.questionId), index("questionChangelog_actor_idx").on(table.actorUserId)]);

/** Histórico por campo dos conteúdos, necessário para uma revisão realmente auditável. */
export const contentChangelog = mysqlTable("contentChangelog", {
  id: int("id").autoincrement().primaryKey(),
  contentId: int("contentId").notNull(),
  actorUserId: int("actorUserId").notNull(),
  changedField: varchar("changedField", { length: 80 }).notNull(),
  oldValue: text("oldValue"),
  newValue: text("newValue"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, table => [index("contentChangelog_content_idx").on(table.contentId), index("contentChangelog_actor_idx").on(table.actorUserId)]);

export type User = typeof users.$inferSelect;
export type Course = typeof courses.$inferSelect;
export type CourseEnrollment = typeof courseEnrollments.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type StudyProfile = typeof studyProfiles.$inferSelect;
export type Discipline = typeof disciplines.$inferSelect;
export type Content = typeof contents.$inferSelect;
export type Question = typeof questions.$inferSelect;
