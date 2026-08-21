import { describe, expect, it } from "vitest";
import { buildCompetitionRanking, defaultCompetitionSettings, evaluateCompetitionAnswer } from "./db";

describe("regras isoladas da competição", () => {
  it("mantém os valores iniciais seguros para uma rodada competitiva", () => {
    expect(defaultCompetitionSettings).toEqual({ pointsPerCorrect: 10, pointsPerWrong: 0, questionsPerRound: 10, isActive: true });
  });

  it("valida respostas sem expor nem reaproveitar dados dos simulados", () => {
    expect(evaluateCompetitionAnswer("true", true)).toBe(true);
    expect(evaluateCompetitionAnswer("false", true)).toBe(false);
    expect(evaluateCompetitionAnswer('"Alternativa B"', "Alternativa B")).toBe(true);
    expect(evaluateCompetitionAnswer('"Alternativa B"', "Alternativa A")).toBe(false);
    expect(() => evaluateCompetitionAnswer("true", "true")).toThrow("Formato de resposta incompatível");
    expect(() => evaluateCompetitionAnswer("{", true)).toThrow("resposta oficial");
  });

  it("soma somente as respostas competitivas e ordena por pontos, acertos e nome", () => {
    const ranking = buildCompetitionRanking([
      { userId: 2, pointsEarned: 10, correct: true },
      { userId: 1, pointsEarned: 20, correct: true },
      { userId: 2, pointsEarned: 10, correct: true },
      { userId: 3, pointsEarned: 20, correct: true },
      { userId: 3, pointsEarned: 0, correct: false },
    ], [
      { id: 1, name: "Carla", username: "carla" },
      { id: 2, name: "Bruno", username: "bruno" },
      { id: 3, name: "Ana", username: "ana" },
    ]);

    expect(ranking).toEqual([
      { position: 1, userId: 2, name: "Bruno", username: "bruno", totalPoints: 20, totalAnswered: 2, totalCorrect: 2 },
      { position: 2, userId: 3, name: "Ana", username: "ana", totalPoints: 20, totalAnswered: 2, totalCorrect: 1 },
      { position: 3, userId: 1, name: "Carla", username: "carla", totalPoints: 20, totalAnswered: 1, totalCorrect: 1 },
    ]);
  });
});
