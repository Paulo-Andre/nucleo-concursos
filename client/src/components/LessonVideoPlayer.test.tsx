import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { LessonVideoPlayer } from "./LessonVideoPlayer";

describe("interface do reprodutor para os alunos", () => {
  it("mostra videoaula do YouTube sem exibir orientações técnicas de proteção contra download", () => {
    const html = renderToStaticMarkup(createElement(LessonVideoPlayer, {
      title: "Aula de Direito Administrativo",
      url: "https://www.youtube.com/watch?v=kSZ4nJheSWA",
    }));
    expect(html).toContain("iframe");
    expect(html).toContain("youtube-nocookie.com");
    expect(html).not.toContain("O player evita link de download direto");
    expect(html).not.toContain("capturas de tela");
    expect(html).not.toContain("Para vídeos próprios, use um arquivo");
  });

  it("mantém controles de reprodução de arquivos próprios sem aviso técnico", () => {
    const html = renderToStaticMarkup(createElement(LessonVideoPlayer, {
      title: "Aula própria",
      url: "https://exemplo.com/video.mp4",
    }));
    expect(html).toContain("<video");
    expect(html).toContain("nodownload");
    expect(html).not.toContain("O player evita link de download direto");
  });
});
