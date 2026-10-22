import { describe, expect, it } from "vitest";
import { resourcesForModule } from "./moduleVideoResources";

describe("vínculos das videoaulas com aulas editadas", () => {
  it("recupera o vídeo da disciplina quando o conteúdo editado não informou link", () => {
    const result = resourcesForModule("da-01", {
      title: "Controle, responsabilidade e regime",
      materialUrl: "/manus-storage/content-pdfs/1/a_abcd1234.pdf",
      videoUrl: null,
    });
    expect(result.videoUrl).toBe("https://www.youtube.com/watch?v=kSZ4nJheSWA");
    expect(result.videoOrigin).toBe("discipline");
    expect(result.videoChannel).toContain("Estratégia Concursos");
    expect(result.materialUrl).toBe("/manus-storage/content-pdfs/1/a_abcd1234.pdf");
  });

  it("preserva o vídeo específico cadastrado pelo administrador", () => {
    const result = resourcesForModule("da-01", {
      title: "Controle, responsabilidade e regime",
      videoUrl: "https://www.youtube.com/watch?v=12345678901",
      videoLabel: "Aula específica do conteúdo",
    });
    expect(result.videoUrl).toBe("https://www.youtube.com/watch?v=12345678901");
    expect(result.videoLabel).toBe("Aula específica do conteúdo");
    expect(result.videoOrigin).toBeUndefined();
  });

  it("não inventa associação quando o módulo não tem vídeo selecionado", () => {
    const content = { title: "Aula própria", videoUrl: null, materialUrl: null };
    expect(resourcesForModule("modulo-externo", content)).toEqual(content);
  });

  it("mantém a separação de vídeos de penal e processo penal", () => {
    expect(resourcesForModule("dpp-01", { title: "Penal" }).videoUrl)
      .toBe("https://www.youtube.com/watch?v=d8YTex6RQ6Q");
    expect(resourcesForModule("dpp-04", { title: "Processual Penal" }).videoUrl)
      .toBe("https://www.youtube.com/watch?v=uxsYwe2C2AQ");
  });
});
