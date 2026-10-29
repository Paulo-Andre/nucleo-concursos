import { describe, expect, it } from "vitest";
import { isIdenticalQuestionForLink } from "./spreadsheetImport";

const original = {
 id: 123, statement: "Qual a conclusão lógica correta nesta situação?",
 passage: "Considere que todos os investigadores são servidores.",
 questionType: "multipla_escolha" as const,
 optionsJson: JSON.stringify(["Todos são servidores", "Nenhum é servidor", "Alguns não são"]),
 answerJson: JSON.stringify("Todos são servidores"),
};
const row = {
 statement: original.statement, passage: original.passage, questionType: original.questionType,
 options: JSON.parse(original.optionsJson) as string[], answer: "Todos são servidores",
};
describe("reutilização de questão já existente na importação", () => {
 it("só aceita equivalência de enunciado, texto-base, tipo, alternativas e gabarito", () => {
  expect(isIdenticalQuestionForLink(original,row)).toBe(true);
  expect(isIdenticalQuestionForLink(original,{...row,passage:"Outro texto-base"})).toBe(false);
  expect(isIdenticalQuestionForLink(original,{...row,answer:"Nenhum é servidor"})).toBe(false);
  expect(isIdenticalQuestionForLink(original,{...row,options:[...row.options].reverse()})).toBe(false);
  expect(isIdenticalQuestionForLink({...original,questionType:"certo_errado"},row)).toBe(false);
 });
 it("não reutiliza enunciado igual se o texto-base do cadastro estiver ausente", () => {
  expect(isIdenticalQuestionForLink({...original,passage:null},row)).toBe(false);
 });
 it("não se confunde com acentos e espaços de borda nos enunciados", () => {
  expect(isIdenticalQuestionForLink({...original,statement:"   "+original.statement+"   "},row)).toBe(true);
 });
});
