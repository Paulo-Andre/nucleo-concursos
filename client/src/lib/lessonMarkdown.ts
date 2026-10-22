/**
 * Normalização mínima do Markdown vindo de planilhas.
 * A formatação é apenas de apresentação: não altera o conteúdo salvo no banco.
 */
export function normalizeLessonMarkdown(text: string): string {
  // Textos de planilhas são não confiáveis: escapar HTML bruto antes do parser.
  // Tags HTML viram texto literal, mas títulos, tabelas, listas e negritos Markdown permanecem.
  const lines = text.replace(/</g, "&lt;").replace(/\r\n?/g, "\n").split("\n");
  let inCodeFence = false;
  return lines.map(line => {
    if (/^\s*(```|~~~)/.test(line)) {
      inCodeFence = !inCodeFence;
      return line;
    }
    if (inCodeFence || /^\s*(#{1,6}\s|[-*+]\s|\d+[.)]\s|\||\[\[)/.test(line)) return line;
    // Continua destacando rótulos editoriais que o editor antigo reconhecia.
    // Não confunde URLs, horas ou frases com dois-pontos no meio com rótulos.
    const match = line.match(/^(\s*(?:>\s*)?)([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ0-9\s–—/()?.-]{1,63}):(?!\/\/)(?=\s|$)/);
    if (!match) return line;
    const rest = line.slice(match[0].length);
    return `${match[1]}**${match[2].trim()}:**${rest ? ` ${rest.trimStart()}` : ""}`;
  }).join("\n");
}
