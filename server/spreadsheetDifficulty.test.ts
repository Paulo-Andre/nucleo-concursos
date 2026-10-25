import { describe, expect, it } from "vitest";
import { normalizeQuestionDifficulty } from "./spreadsheetImport";

describe("dificuldade da importação de questões", () => {
  it.each([
    ["Fácil", "basic"], ["Facil", "basic"], ["BÁSICO", "basic"], ["basic", "basic"],
    ["Média", "intermediate"], ["Media", "intermediate"], ["Médio", "intermediate"],
    ["Medio", "intermediate"], ["Intermediário", "intermediate"],
    ["intermediate", "intermediate"], ["medium", "intermediate"],
    ["Difícil", "advanced"], ["Dificil", "advanced"], ["Avançado", "advanced"],
    ["advanced", "advanced"],
  ] as const)("converte %s em %s", (raw, expected) => {
    expect(normalizeQuestionDifficulty(raw)).toBe(expected);
  });

  it("mantém intermediate quando o campo está vazio", () => {
    expect(normalizeQuestionDifficulty("")).toBe("intermediate");
    expect(normalizeQuestionDifficulty("  ")).toBe("intermediate");
  });

  it.each(["1", "4", "moderada", "médio/difícil", "qualquer", "sem classificação"])(
    "rejeita %s", raw => {
      expect(() => normalizeQuestionDifficulty(raw)).toThrow(/dificuldade inválida/i);
    },
  );
});
