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

  it("corrige na mesma tentativa múltipla escolha e certo/errado sem trocar gabaritos", () => {
    const bank = [
      { canonicalKey: "central-1", questionId: "central-1", correctAnswer: "Alternativa correta", discipline: "Português", block: "I", persistedId: 1, snapshot: { type: "multipla_escolha", answer: "Alternativa correta" } },
      { canonicalKey: "central-2", questionId: "central-2", correctAnswer: false, discipline: "Direito", block: "I", persistedId: 2, snapshot: { type: "certo_errado", answer: false } },
    ];
    const correct = scoreSimulation([{ questionId: "central-1", submittedAnswer: "Alternativa correta" }, { questionId: "central-2", submittedAnswer: false }], bank);
    expect(correct).toMatchObject({ total: 2, correct: 2, errors: 0 });
    expect(correct.persistent).toHaveLength(2);
    const incorrect = scoreSimulation([{ questionId: "central-1", submittedAnswer: "Outra alternativa" }, { questionId: "central-2", submittedAnswer: true }], bank);
    expect(incorrect.correct).toBe(0);
    expect(() => scoreSimulation([{ questionId: "central-1", submittedAnswer: true }], bank)).not.toThrow();
    expect(scoreSimulation([{ questionId: "central-1", submittedAnswer: true }], bank).correct).toBe(0);
  });

  it("rejeita questões desconhecidas ou repetição com prefixo alternativo", () => {
    expect(() => scoreSimulation([{ questionId: "desconhecida", submittedAnswer: true }], questions)).toThrow();
    expect(() => scoreSimulation([{ questionId: "8", submittedAnswer: true }, { questionId: "central-8", submittedAnswer: true }], questions)).toThrow();
  });
});
