import React from "react";
import { BlockMath } from "react-katex";
import { Streamdown } from "streamdown";
import { normalizeLessonMarkdown } from "@/lib/lessonMarkdown";
import "katex/dist/katex.min.css";

export type RichContentBlock =
  | { type: "formula"; formula: string }
  | { type: "paragraph"; text: string };

/** Mantém compatibilidade com a marcação já persistida pelo editor. */
export function parseRichContentBody(body: string): RichContentBlock[] {
  return body.split(/\n{2,}/).map(block => block.trim()).filter(Boolean).map(block => {
    const formula = block.match(/^\{\{formula:\s*([\s\S]+?)\s*\}\}$/i);
    return formula ? { type: "formula", formula: formula[1] } : { type: "paragraph", text: block };
  });
}

/** Marcadores [[...]] do editor antigo continuam destacados, sem liberar HTML. */
function renderInlineHighlights(children: React.ReactNode): React.ReactNode {
  return React.Children.map(children, child => {
    if (typeof child !== "string") return child;
    return child.split(/(\[\[[\s\S]*?\]\])/g).map((part, index) => {
      const match = part.match(/^\[\[([\s\S]*?)\]\]$/);
      return match ? <mark key={index} className="rounded bg-[#fff0b8] px-1 font-semibold text-[#62490c]">{match[1]}</mark> : part;
    });
  });
}

const lessonComponents = {
  p: ({ children }: { children?: React.ReactNode }) =>
    <p>{renderInlineHighlights(children)}</p>,
  strong: ({ children }: { children?: React.ReactNode }) => {
    const label = React.Children.toArray(children)
      .filter((child): child is string => typeof child === "string").join("").trim();
    const isEditorialLabel = label.length > 1 && label.length <= 70 && label.endsWith(":");
    return <strong className={isEditorialLabel
      ? "rounded-md bg-[#e1f1ed] px-1.5 py-0.5 font-extrabold text-[#09596a]"
      : "font-bold text-[#25434e]"}>{children}</strong>;
  },
};

/**
 * As aulas importadas são documentos em Markdown, não parágrafos de texto bruto.
 * Usar o parser GFM do Streamdown (tabelas, títulos, listas e citações) e os
 * estilos do artigo; nada é alterado no banco ou na posição dos recursos.
 */
export function RichContentBody({ body }: { body: string }) {
  const blocks = parseRichContentBody(body);
  if (!blocks.some(block => block.type === "formula")) {
    return <article className="lesson-article min-w-0" aria-label="Texto da aula">
      <Streamdown mode="static" controls={false} components={lessonComponents}>
        {normalizeLessonMarkdown(body)}
      </Streamdown>
    </article>;
  }

  return <article className="lesson-article min-w-0" aria-label="Texto da aula">
    {blocks.map((block, index) => block.type === "formula"
      ? <div key={index} className="lesson-formula overflow-x-auto rounded-xl border border-[#8dbfb2] bg-[#edf8f4] px-4 py-5 text-center text-[#174f45]">
          <BlockMath math={block.formula} errorColor="#a3472c" />
        </div>
      : <Streamdown key={index} mode="static" controls={false} components={lessonComponents}>
          {normalizeLessonMarkdown(block.text)}
        </Streamdown>)}
  </article>;
}
