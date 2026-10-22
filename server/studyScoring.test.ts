import { describe, expect, it } from "vitest";
import { scoreSimulation } from "./studyScoring";

const questions = [
  { canonicalKey: "legacy-a", questionId: "a", correctAnswer: false, discipline: "Direito", block: "I" },
  { canonicalKey: "central-8", questionId: "central-8", correctAnswer: true, discipline: "Português", block: "II", persistedId: 8, snapshot: { statement: "Enunciado original", answer: true } },
  { canonicalKey: "central-8", questionId: "8", correctAnswer: true, discipline: "Português", block: "II", persistedId: 8, snapshot: { statement: "Enunciado original", answer: true } },
];

describe("correção de simulado a partir do servidor", () => {
  it("recalcula nota, estatísticas e snapshot com respostas reais", () => {
    const result = scoreSimulation([{ questionId: "a", submittedAnswer: true }, { questionId: "central-8", submittedAnswer: true }], questions);
    expect(result).toMatchObject({ total: 2, correct: 1, errors: 1, byDiscipline: { Direito: { total: 1, correct: 0 }, Português: { total: 1, correct: 1 } } });
    expect(result.persistent[0]?.snapshot).toMatchObject({ answer: true, statement: "Enunciado original" });
  });

  it("rejeita questões desconhecidas ou repetição com prefixo alternativo", () => {
    expect(() => scoreSimulation([{ questionId: "desconhecida", submittedAnswer: true }], questions)).toThrow();
    expect(() => scoreSimulation([{ questionId: "8", submittedAnswer: true }, { questionId: "central-8", submittedAnswer: true }], questions)).toThrow();
  });
});
