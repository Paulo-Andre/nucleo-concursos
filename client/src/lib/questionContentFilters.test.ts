import { describe, expect, it } from "vitest";
import { countQuestionTypes, filterQuestionsByType, questionTypeLabel } from "./questionContentFilters";
import { countQuestionsByContent } from "./adminUiHelpers";

const questions = [
  { id: 1, questionType: "certo_errado" as const, contentIds: [11, 12] },
  { id: 2, questionType: "multipla_escolha" as const, contentIds: [11] },
  { id: 3, questionType: "certo_errado" as const, contentIds: [12] },
  { id: 4, questionType: "multipla_escolha" as const, contentIds: [12, 13] },
];

describe("filtro e identificação da questão por conteúdo", () => {
  it("identifica o tipo sem abrir a edição da questão", () => {
    expect(questionTypeLabel("certo_errado")).toBe("Certo / Errado");
    expect(questionTypeLabel("multipla_escolha")).toBe("Múltipla escolha");
  });

  it("mostra todos os tipos por padrão, sem excluir perguntas", () => {
    expect(filterQuestionsByType(questions, "all")).toEqual(questions);
    expect(countQuestionTypes(questions)).toEqual({ certoErrado: 2, multiplaEscolha: 2, total: 4 });
  });

  it("filtra só as questões de Certo / Errado, com contagem correta em cada conteúdo", () => {
    const filtered = filterQuestionsByType(questions, "certo_errado");
    expect(filtered.map(question => question.id)).toEqual([1, 3]);
    expect([...countQuestionsByContent(filtered)]).toEqual([[11, 1], [12, 2]]);
  });

  it("filtra só as questões de Múltipla escolha preservando a associação a vários conteúdos", () => {
    const filtered = filterQuestionsByType(questions, "multipla_escolha");
    expect(filtered.map(question => question.id)).toEqual([2, 4]);
    expect([...countQuestionsByContent(filtered)]).toEqual([[11, 1], [12, 1], [13, 1]]);
  });

  it("não cria perguntas quando o tipo solicitado não existe", () => {
    expect(filterQuestionsByType(questions.slice(0, 1), "multipla_escolha")).toEqual([]);
    expect(countQuestionTypes([])).toEqual({ certoErrado: 0, multiplaEscolha: 0, total: 0 });
  });
});
