import { describe, expect, it } from "vitest";
import { normalizeLessonMarkdown } from "./lessonMarkdown";

describe("normalização não destrutiva de apostilas importadas", () => {
  it("realça rótulos simples antes dos dois pontos e preserva o restante do parágrafo", () => {
    expect(normalizeLessonMarkdown("Conceitos-chave: compreender e interpretar"))
      .toBe("**Conceitos-chave:** compreender e interpretar");
    expect(normalizeLessonMarkdown("Em outras palavras: a ideia mais importante"))
      .toBe("**Em outras palavras:** a ideia mais importante");
  });

  it("não altera headings, tabelas, listas, URLs, negrito pronto ou código", () => {
    const source = [
      "## Capítulo 1",
      "| Texto | Finalidade |",
      "| --- | --- |",
      "| Aviso | Informar |",
      "- Exemplo: texto",
      "**Atenção:** frase pronta",
      "https://exemplo.com/aula",
      "Horário 10:30",
      "```",
      "Alerta: trecho literal",
      "```",
    ].join("\n");
    expect(normalizeLessonMarkdown(source)).toBe(source);
  });

  it("mantém a marcação explícita [[destaque]] já salva no conteúdo", () => {
    expect(normalizeLessonMarkdown("Leia [[com atenção]]")).toBe("Leia [[com atenção]]");
  });
});


describe("tabelas HTML existentes na biblioteca", () => {
  it("converte tabela-verdade HTML para formato GFM sem mostrar tags na aula", () => {
    const input = [
      "### Quadro ou figura",
      "<table><tbody><tr><td>p</td><td>q</td><td>p ∧ q</td></tr>",
      "<tr><td>V</td><td>F</td><td>F</td></tr></tbody></table>",
    ].join("\n");
    const output = normalizeLessonMarkdown(input);
    expect(output).toContain("| p | q | p ∧ q |");
    expect(output).toContain("| --- | --- | --- |");
    expect(output).toContain("| V | F | F |");
    expect(output).not.toContain("&lt;table&gt;");
  });

  it("mantém HTML perigoso escapado e não usa marcação executável", () => {
    const output = normalizeLessonMarkdown("<script>alert(1)</script>\n\n<iframe src=x></iframe>");
    expect(output).toContain("&lt;script>");
    expect(output).toContain("&lt;iframe");
  });

  it("substitui SVG legado não seguro por legenda em vez de mostrar tags", () => {
    const output = normalizeLessonMarkdown('<figure><svg role="img"><circle r="10"/></svg><figcaption>Diagrama de conjuntos</figcaption></figure>');
    expect(output).toContain("Diagrama de conjuntos");
    expect(output).not.toContain("&lt;svg");
  });
});
