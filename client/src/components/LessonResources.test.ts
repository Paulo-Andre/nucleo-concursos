import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { isPdfLessonResource, LessonResources, safeLessonResourceUrl } from "./LessonResources";

describe("recursos de aulas publicados", () => {
  it("mostra o play do vídeo, a visualização e o download de PDF", () => {
    const html = renderToStaticMarkup(createElement(LessonResources, {
      content: {
        title: "Controle e responsabilidade",
        videoUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        videoLabel: "Aula gravada",
        materialUrl: "/manus-storage/content-pdfs/1/123e4567-e89b-12d3-a456-426614174000_abcd1234.pdf",
        materialLabel: "Apostila",
      },
    }));
    expect(html).toContain("Reproduzir vídeo");
    expect(html).toContain("Visualizar PDF");
    expect(html).toContain("Baixar PDF");
    expect(html).toContain("download=");
    expect(html).toContain("youtube-nocookie.com/embed/");
  });

  it("explica quando ainda não existem vídeo e PDF", () => {
    const html = renderToStaticMarkup(createElement(LessonResources, { content: { title: "Aula sem anexos" } }));
    expect(html).toContain("Nenhum vídeo associado");
    expect(html).toContain("Nenhum PDF cadastrado");
    expect(html).not.toContain("download=");
  });

  it("rejeita protocolos perigosos e caminhos internos inválidos", () => {
    expect(safeLessonResourceUrl("javascript:alert(1)")).toBeNull();
    expect(safeLessonResourceUrl("//outro-servidor/arquivo.pdf")).toBeNull();
    expect(safeLessonResourceUrl("/manus-storage/../segredo")).toBeNull();
    expect(safeLessonResourceUrl("https://exemplo.com/apostila.pdf")).toBe("https://exemplo.com/apostila.pdf");
    expect(isPdfLessonResource("https://exemplo.com/a.pdf?token=segredo")).toBe(true);
    expect(isPdfLessonResource("https://exemplo.com/a.html")).toBe(false);
  });
});
