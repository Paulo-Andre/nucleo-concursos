import { describe, expect, it } from "vitest";
import { resolvePlatformAlertTitle } from "./platformAlertPresentation";

describe("apresentação dos alertas da plataforma", () => {
  it("prioriza o título personalizado enviado pelo ROOT", () => {
    expect(resolvePlatformAlertTitle("  Novo simulado liberado  ", "improvement")).toBe("Novo simulado liberado");
  });

  it("mantém um título seguro para alertas antigos sem título", () => {
    expect(resolvePlatformAlertTitle(null, "urgent")).toBe("Urgência");
  });
});
