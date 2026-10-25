import { describe, expect, it } from "vitest";
import { auditQuestion } from "./questionPedagogicalAudit";
const base={id:1,questionType:"multipla_escolha" as const,options:["Correta","Incorreta"],answer:"Correta",explanation:"Justificativa suficiente."};
describe("triagem pedagógica sem alteração de questões",()=>{
 it("identifica enunciado genérico e referência a capítulo",()=>{
  const flags=auditQuestion({...base,statement:"[PT-M04-A37-Q08] O capítulo aborda Identificação de núcleo verbal. Qual alternativa explica de modo mais preciso o aspecto estudado nesse capítulo?"});
  expect(flags.map(f=>f.code)).toContain("META_CHAPTER");
  expect(flags.map(f=>f.code)).toContain("GENERIC_PROMPT");
 });
 it("identifica erro estrutural de gabarito",()=>{
  expect(auditQuestion({...base,statement:"Qual alternativa?",answer:"Outra"}).map(f=>f.code)).toContain("INVALID_KEY");
 });
 it("não altera ou condena automaticamente questões válidas",()=>{
  const q={...base,statement:"Na oração A equipe registrou o fato, qual expressão exerce função de sujeito?"};
  expect(auditQuestion(q)).toEqual([]);
  expect(q.answer).toBe("Correta");
 });
});
