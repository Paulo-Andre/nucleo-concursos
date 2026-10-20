export type DailyQuickCheckCandidate = {
  id: number;
  statement: string;
  difficulty: "basic" | "intermediate" | "advanced";
  questionType: "certo_errado" | "multipla_escolha";
};

function stableHash(value: string) {
  return Array.from(value).reduce((hash, character) => ((hash << 5) - hash + character.charCodeAt(0)) | 0, 0) >>> 0;
}

/** Histórico por aluno e curso, isolado dos IDs usados para os simulados. */
export function dailyCheckHistoryKey(courseId: string, questionId: number | string): string {
  return `daily:${courseId}:${questionId}`;
}

export function dailyCheckShownIds(courseId: string, usedQuestionIds: string[]): string[] {
  const prefix = `daily:${courseId}:`;
  return usedQuestionIds.filter(id => id.startsWith(prefix)).map(id => id.slice(prefix.length));
}

/** Fecha o ciclo ao esgotar o banco e preserva a última questão para evitar repetição imediata. */
export function recordDailyCheckSelection(input: {
  courseId: string;
  questionId: number | string;
  usedQuestionIds: string[];
  resetCycle: boolean;
}) {
  const prefix = `daily:${input.courseId}:`;
  const retained = input.resetCycle
    ? input.usedQuestionIds.filter(id => !id.startsWith(prefix))
    : input.usedQuestionIds;
  return Array.from(new Set([...retained, dailyCheckHistoryKey(input.courseId, input.questionId)]));
}

/**
 * Seleção pseudoaleatória, independente por usuário, curso e data.
 * Visita todas as perguntas C/E disponíveis antes de repetir; só repete
 * imediatamente quando existe uma única questão elegível.
 */
export function selectDailyQuickCheckQuestion<T extends DailyQuickCheckCandidate>(input: {
  questions: T[];
  userId: number;
  courseId: string;
  day: string;
  recentQuestionIds: string[];
  shownQuestionIds?: string[];
}) {
  // Todas as questões C/E publicadas devem participar, inclusive as longas ou avançadas.
  const eligibleQuestions = input.questions.filter(question => question.questionType === "certo_errado");
  if (!eligibleQuestions.length) return null;
  const unique = Array.from(new Map(eligibleQuestions.map(question => [question.id, question])).values());
  const shown = new Set(input.shownQuestionIds ?? []);
  const unshown = unique.filter(question => !shown.has(String(question.id)));
  const currentCycle = unshown.length ? unshown : unique;
  const withoutRecent = currentCycle.filter(question => !input.recentQuestionIds.includes(String(question.id)));
  const candidates = withoutRecent.length ? withoutRecent : currentCycle;
  const ordered = [...candidates].sort((left, right) => left.id - right.id);
  return ordered[stableHash(`${input.userId}:${input.courseId}:${input.day}`) % ordered.length] ?? null;
}
