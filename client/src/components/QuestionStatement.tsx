/** Formata enunciados sem alterar o texto persistido da questão. */
export function splitQuestionStatement(raw: string, questionType?: "certo_errado" | "multipla_escolha") {
  const input = raw.trim();
  const codeMatch = /^\[([A-Z]{2,}(?:-[A-Z0-9]+){2,})\]\s*/i.exec(input);
  const code = codeMatch?.[1] ?? null;
  const statement = codeMatch ? input.slice(codeMatch[0].length).trim() : input;
  // Somente separa frases curtas seguidas de pergunta explícita. Não divide
  // automaticamente textos extensos, questões com várias perguntas ou citações.
  const match = /^(.{12,320}?[.!?])\s+((?:(?:No contexto|Nesse contexto|Nessa situação|Com base (?:no|na) (?:texto|trecho|oração)|Considerando (?:o|a) (?:texto|trecho|oração)),?\s+)?(?:Qual|Quais|Que|Como|Por que|Em qual|Assinale|Identifique|Indique)\b[^]*\?)$/i.exec(statement);
  if (questionType === "certo_errado" && !match) {
    // C/E frequentemente apresenta um trecho e, na frase seguinte, uma
    // afirmação gramatical a julgar. Se não houver divisão segura, preserva tudo.
    const assertion = /^(.{12,600}[.!])\s+((?:Há\s+(?:concordância|emprego|uso|erro|correção|inadequação)|A\s+(?:concordância|construção|expressão|oração|forma|frase)|O\s+(?:emprego|uso|verbo|termo|sujeito|predicado|pronome)|Nesse\s+(?:caso|trecho)|Nessa\s+(?:oração|frase))\b[^?]{8,500}[.!])$/i.exec(statement);
    if (assertion && !/\?/.test(assertion[1])) return { code, context: assertion[1], question: assertion[2] };
  }
  if (!match || /\?/.test(match[1]) || (match[2].match(/\?/g)?.length ?? 0) !== 1) {
    return { code, context: null as string | null, question: statement };
  }
  return { code, context: match[1], question: match[2] };
}

export function QuestionStatement({ statement, compact = false, questionType }: { statement: string; compact?: boolean; questionType?: "certo_errado" | "multipla_escolha" }) {
  const parts = splitQuestionStatement(statement, questionType);
  return <div className={compact ? "space-y-2" : "space-y-4"}>
    {parts.code && <p className="text-[10px] font-semibold tracking-wide text-[#52717d]">QUESTÃO · {parts.code}</p>}
    {parts.context && <div className="rounded-xl border-l-4 border-[#8bc7bc] bg-[#eef6f3] p-3 sm:p-4">
      <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-[#47726f]">{questionType === "certo_errado" ? "Leia o texto" : "Leia o trecho"}</p>
      <p className={compact ? "text-sm leading-6 text-[#254650]" : "text-base leading-7 text-[#254650]"}>“{parts.context}”</p>
    </div>}
    {parts.context && questionType === "certo_errado" && <p className="text-[10px] font-bold uppercase tracking-wider text-[#47726f]">Julgue a afirmação</p>}
    <p className={compact ? "text-sm font-semibold leading-6 text-[#1c3945]" : "font-display text-xl font-bold leading-9 text-[#1c3945] sm:text-2xl"}>{parts.question}</p>
  </div>;
}
