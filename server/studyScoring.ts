export type AnswerSubmission = { questionId: string; submittedAnswer: boolean | string };

export type AuthoritativeQuestion = {
  canonicalKey: string;
  questionId: string;
  correctAnswer: boolean | string;
  discipline: string;
  block: string;
  persistedId?: number;
  snapshot?: Record<string, unknown>;
};

export function scoreSimulation(
  submissions: AnswerSubmission[],
  questions: AuthoritativeQuestion[],
) {
  if (!submissions.length || submissions.length > 250) throw new Error("Número inválido de questões no simulado.");

  const byQuestionId = new Map(questions.map(question => [question.questionId, question]));
  const seen = new Set<string>();
  const answers: { questionId: string; correct: boolean }[] = [];
  const persistent: { questionId: number; correct: boolean; snapshot: Record<string, unknown> }[] = [];
  const byDiscipline: Record<string, { correct: number; total: number }> = {};
  const byBlock: Record<string, { correct: number; total: number }> = {};
  let correct = 0;

  for (const submission of submissions) {
    const question = byQuestionId.get(submission.questionId);
    if (!question || seen.has(question.canonicalKey)) throw new Error("O simulado contém uma questão repetida ou não autorizada.");
    seen.add(question.canonicalKey);
    const isCorrect = submission.submittedAnswer === question.correctAnswer;
    if (isCorrect) correct += 1;
    answers.push({ questionId: question.questionId, correct: isCorrect });
    const discipline = byDiscipline[question.discipline] ??= { correct: 0, total: 0 };
    discipline.total += 1;
    if (isCorrect) discipline.correct += 1;
    const block = byBlock[question.block] ??= { correct: 0, total: 0 };
    block.total += 1;
    if (isCorrect) block.correct += 1;
    if (question.persistedId !== undefined && question.snapshot) {
      persistent.push({ questionId: question.persistedId, correct: isCorrect, snapshot: question.snapshot });
    }
  }

  return { total: submissions.length, correct, errors: submissions.length - correct, byDiscipline, byBlock, answers, persistent };
}
