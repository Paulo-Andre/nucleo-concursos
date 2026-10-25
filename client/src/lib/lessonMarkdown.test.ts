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
