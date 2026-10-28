/**
 * Normalização mínima do Markdown vindo de planilhas.
 * A formatação é apenas de apresentação: não altera o conteúdo salvo no banco.
 */
/**
 * As planilhas antigas do Núcleo Concursos gravaram tabelas HTML no corpo da
 * aula. Não fazemos renderização direta de HTML enviado por usuários:
 * extraímos somente o conteúdo de células e convertemos para tabela GFM,
 * deixando o Streamdown fazer a renderização segura.
 */
export function convertLegacyTablesToMarkdown(text: string): string {
  const decode = (value: string) => value
    .replace(/&nbsp;/gi, " ").replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<").replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
  return text.replace(/<table\b[^>]*>[\s\S]*?<\/table>/gi, original => {
    const rowMatches = [...original.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)];
    const rows = rowMatches.map(match => {
      const cells = [...match[1].matchAll(/<(td|th)\b[^>]*>([\s\S]*?)<\/\1>/gi)];
      return cells.map(cell => decode(cell[2].replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim())
        .replace(/\|/g, "\\|").replace(/\n/g, " "));
    }).filter(row => row.length > 0);
    if (!rows.length) return original;
    const columns = Math.max(...rows.map(row => row.length));
    if (columns > 20 || rows.length > 150) return original;
    const pad = (row: string[]) => [...row, ...Array(Math.max(0, columns - row.length)).fill("")];
    const mdrow = (row: string[]) => "| " + pad(row).join(" | ") + " |";
    const header = mdrow(rows[0]);
    const line = "| " + Array(columns).fill("---").join(" | ") + " |";
    return "\n\n" + [header, line, ...rows.slice(1).map(mdrow)].join("\n") + "\n\n";
  });
}

/**
 * Figuras SVG embutidas em conteúdo importado não podem ser executadas como
 * HTML arbitrário. Exibimos aviso didático até o conteúdo ser reimportado
 * com um recurso visual no formato Markdown ou arquivo de imagem aprovado.
 */
export function normalizeLegacyFigures(text: string): string {
  return text.replace(/<figure\b[^>]*>[\s\S]*?<\/figure>/gi, original => {
    if (!/<svg\b/i.test(original)) return original;
    const caption = original.match(/<figcaption\b[^>]*>([\s\S]*?)<\/figcaption>/i)?.[1]
      ?.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
    return "\n\n> **Figura do conteúdo legado:** " +
      (caption || "visual indisponível nesta versão; consulte a apostila em PDF.") +
      "\n\n";
  });
}

export function normalizeLessonMarkdown(text: string): string {
  // Textos de planilhas são não confiáveis: escapar HTML bruto antes do parser.
  // Tags HTML viram texto literal, mas títulos, tabelas, listas e negritos Markdown permanecem.
  const lines = normalizeLegacyFigures(convertLegacyTablesToMarkdown(text)).replace(/</g, "&lt;").replace(/\r\n?/g, "\n").split("\n");
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
