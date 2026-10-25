import { describe, expect, it } from "vitest";
import { splitQuestionStatement } from "./QuestionStatement";

describe("apresentação de questões", () => {
  it("separa identificação, situação e pergunta explícita", () => {
    expect(splitQuestionStatement("[PT-M04-A38-Q05] O gestor decidiu analisar e registrar os dados. Qual alternativa explica de modo mais preciso o aspecto destacado na situação apresentada?")).toEqual({
      code: "PT-M04-A38-Q05",
      context: "O gestor decidiu analisar e registrar os dados.",
      question: "Qual alternativa explica de modo mais preciso o aspecto destacado na situação apresentada?",
    });
  });
  it("separa texto-base de pergunta iniciada por No contexto", () => {
    expect(splitQuestionStatement("O servidor agiu com rapidez para evitar prejuízo. No contexto, qual palavra pode substituir “rapidez” sem alterar substancialmente o sentido?")).toEqual({
      code: null,
      context: "O servidor agiu com rapidez para evitar prejuízo.",
      question: "No contexto, qual palavra pode substituir “rapidez” sem alterar substancialmente o sentido?",
    });
  });
  it("não divide pergunta com duas interrogações", () => {
    const original = "O gestor falou. Qual é a regra? Como ela funciona?";
    expect(splitQuestionStatement(original).context).toBeNull();
  });
  it("separa oração e afirmação em questão de certo ou errado", () => {
    expect(splitQuestionStatement("Os pareceres foi encaminhado ontem. Há concordância correta entre sujeito e locução verbal.", "certo_errado")).toEqual({
      code: null,
      context: "Os pareceres foi encaminhado ontem.",
      question: "Há concordância correta entre sujeito e locução verbal.",
    });
  });
  it("preserva um item de C/E que não pode ser separado com segurança", () => {
    const original = "A concordância verbal deve seguir o núcleo do sujeito.";
    expect(splitQuestionStatement(original, "certo_errado")).toEqual({code: null, context: null, question: original});
  });
  it("não separa uma pergunta sem cenário", () => {
    const result = splitQuestionStatement("Qual é o sujeito da oração?");
    expect(result.context).toBeNull();
    expect(result.question).toBe("Qual é o sujeito da oração?");
  });
  it("mantém intactos enunciados com estrutura ambígua", () => {
    const original = "O gestor perguntou: Qual decisão tomar? Qual alternativa está correta?";
    expect(splitQuestionStatement(original).question).toBe(original);
  });
});
