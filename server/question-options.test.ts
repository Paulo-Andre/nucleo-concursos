import { describe, expect, it } from "vitest";
import { normalizeQuestionOptions } from "../client/src/lib/questionOptions";

describe("normalização de alternativas", () => {
  it("converte quebras coladas e remove alternativas repetidas sem alterar a primeira ocorrência", () => {
    expect(normalizeQuestionOptions("A) certo\\nA) certo\nB) errado\n\nB) errado\r\nC) talvez")).toEqual([
      "A) certo",
      "B) errado",
      "C) talvez",
    ]);
  });
});
