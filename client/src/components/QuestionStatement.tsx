import type { ReactNode } from "react";

/** Formata enunciados sem alterar o texto persistido da questão. */
export function splitQuestionStatement(raw: string) {
  const input = raw.trim();
  const codeMatch = /^\[([A-Z]{2,}(?:-[A-Z0-9]+){2,})\]\s*/i.exec(input);
  const code = codeMatch?.[1] ?? null;
  const statement = codeMatch ? input.slice(codeMatch[0].length).trim() : input;
  // Somente separa frases curtas seguidas de pergunta explícita. Não divide
  // automaticamente textos extensos, questões com várias perguntas ou citações.
  const match = /^(.{12,320}?[.!?])\s+(Qual\b[^]*\?)$/i.exec(statement);
  if (!match || /\?/.test(match[1]) || (match[2].match(/\?/g)?.length ?? 0) !== 1) {
    return { code, context: null as string | null, question: statement };
  }
  return { code, context: match[1], question: match[2] };
}

export function QuestionStatement({ statement, compact = false }: { statement: string; compact?: boolean }) {
  const parts = splitQuestionStatement(statement);
  return <div className={compact ? "space-y-2" : "space-y-4"}>
    {parts.code && <p className="text-[10px] font-semibold tracking-wide text-[#52717d]">QUESTÃO · {parts.code}</p>}
    {parts.context && <div className="rounded-xl border-l-4 border-[#8bc7bc] bg-[#eef6f3] p-3 sm:p-4">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#47726f]">Situação apresentada</p>
      <p className={compact ? "text-sm leading-6 text-[#254650]" : "text-base leading-7 text-[#254650]"}>{parts.context}</p>
    </div>}
    <p className={compact ? "text-sm font-semibold leading-6 text-[#1c3945]" : "font-display text-xl font-bold leading-9 text-[#1c3945] sm:text-2xl"}>{parts.question}</p>
  </div>;
}
