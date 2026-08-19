import { describe, expect, it } from "vitest";
import { reviewEmptyStateMessage, reviewFlowSteps } from "./adminUiHelpers";

describe("orientações da revisão administrativa", () => {
  it("indica como adicionar uma questão à fila quando não há pendências", () => {
    expect(reviewEmptyStateMessage(false)).toContain("Adicionar à revisão");
  });

  it("expõe o fluxo completo e ordenado de revisão", () => {
    expect(reviewFlowSteps).toEqual([
      "Adicionar à revisão",
      "Localizar na fila",
      "Abrir e corrigir, se necessário",
      "Aprovar, solicitar correção ou rejeitar",
    ]);
  });
});
