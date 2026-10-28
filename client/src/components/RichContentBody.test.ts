import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContentBodyEditor } from "./ContentBodyEditor";
import { parseRichContentBody, RichContentBody } from "./RichContentBody";

describe("formatação didática de conteúdos", () => {
  it("separa fórmulas em bloco e preserva os parágrafos com destaque", () => {
    expect(parseRichContentBody("Conceito [[essencial]].\n\n{{formula: \\frac{a}{b}}}")).toEqual([
      { type: "paragraph", text: "Conceito [[essencial]]." },
      { type: "formula", formula: "\\frac{a}{b}" },
    ]);
  });

  it("renderiza a marcação de destaque sem aceitar HTML livre", () => {
    const markup = renderToStaticMarkup(createElement(RichContentBody, { body: "Leia [[com atenção]] <script>alert(1)</script>." }));
    expect(markup).toContain("com atenção");
    expect(markup).toContain("&lt;script&gt;");
    expect(markup).not.toContain("<script>");
  });

  it("destaca rótulos antes de dois-pontos sem marcar URLs como títulos", () => {
    const markup = renderToStaticMarkup(createElement(RichContentBody, {
      body: "Conceitos-chave: controle judicial\nPontos de atenção: legitimidade\n\nExemplo: dano causado\nhttps://exemplo.com/video",
    }));
    expect(markup).toContain("<strong");
    expect(markup).toContain("Conceitos-chave:");
    expect(markup).toContain("Pontos de atenção:");
    expect(markup).toContain("Exemplo:");
    expect(markup).not.toContain("https:</strong>");
  });


  it("diagrama o Markdown das 45 aulas sem exibir sintaxe crua", () => {
    const body = [
      "# AULA 01 — INTERPRETAÇÃO E COMPREENSÃO",
      "",
      "## Como aproveitar a apostila",
      "",
      "**Em outras palavras:** explique com suas palavras e **não invente** informações.",
      "",
      "### 1.1 Compreensão global",
      "",
      "- Primeiro leia o texto.",
      "- Depois confira o exemplo.",
      "",
      "| Afirmação | Correta? | Justificativa |",
      "| --- | --- | --- |",
      "| A escola abre aos sábados | **Sim** | Informação expressa |",
      "",
      "> **Atenção:** a prova cobra o que foi escrito.",
    ].join("\n");
    const html = renderToStaticMarkup(createElement(RichContentBody, { body }));
    expect(html).toMatch(/<h1\b/);
    expect(html).toMatch(/<h2\b/);
    expect(html).toMatch(/<h3\b/);
    expect(html).toMatch(/<strong\b/);
    expect(html).toMatch(/<ul\b/);
    expect(html).toMatch(/<li\b/);
    expect(html).toMatch(/<table\b/);
    expect(html).toMatch(/<th\b/);
    expect(html).toMatch(/<td\b/);
    expect(html).toMatch(/<blockquote\b/);
    expect(html).not.toContain("## Como aproveitar");
    expect(html).not.toContain("**Em outras palavras");
    expect(html).not.toContain("| --- |");
  });

  it("continua renderizando os destaques existentes e HTML não executável", () => {
    const html = renderToStaticMarkup(createElement(RichContentBody, {
      body: "Leia [[com atenção]] e **explique o motivo**. <script>alert(1)</script>",
    }));
    expect(html).toContain("<mark");
    expect(html).toContain("com atenção");
    expect(html).toContain("<strong");
    expect(html).not.toContain("<script>");
  });


  it("renderiza a tabela HTML legada como tabela real, nunca como texto com tags", () => {
    const body = "### Quadro ou figura\n\n<table><tbody><tr><td>p</td><td>q</td></tr><tr><td>V</td><td>F</td></tr></tbody></table>";
    const markup = renderToStaticMarkup(createElement(RichContentBody, { body }));
    expect(markup).toMatch(/<table\b/);
    expect(markup).toMatch(/<td\b/);
    expect(markup).not.toContain("&lt;table");
    expect(markup).not.toContain("<tbody>&lt;");
  });

  it("apresenta os comandos de destaque e fórmula no editor ROOT", () => {
    const markup = renderToStaticMarkup(createElement(ContentBodyEditor, { value: "", onChange: () => undefined }));
    expect(markup).toContain("Destacar seleção");
    expect(markup).toContain("Inserir fórmula");
  });
});
