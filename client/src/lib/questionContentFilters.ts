/** Tipos persistidos na biblioteca central: o filtro é apenas visual. */
export type QuestionTypeFilter = "all" | "certo_errado" | "multipla_escolha";
export type QuestionType = Exclude<QuestionTypeFilter, "all">;

export function questionTypeLabel(type: QuestionType) {
  return type === "certo_errado" ? "Certo / Errado" : "Múltipla escolha";
}

export function filterQuestionsByType<T extends { questionType: QuestionType }>(
  questions: T[],
  type: QuestionTypeFilter,
): T[] {
  return type === "all" ? questions : questions.filter(question => question.questionType === type);
}

export function countQuestionTypes<T extends { questionType: QuestionType }>(questions: T[]) {
  const certoErrado = questions.filter(question => question.questionType === "certo_errado").length;
  const multiplaEscolha = questions.filter(question => question.questionType === "multipla_escolha").length;
  return { certoErrado, multiplaEscolha, total: certoErrado + multiplaEscolha };
}
