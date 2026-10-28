/** Mapeamento de apostilas independente da disciplina cadastrada.
 * Títulos "Aula 01", códigos "SIGLA 2.1" e nomes exatos são inferidos.
 * Outros formatos são associados explicitamente ao ID do conteúdo ou grupo.
 */
export type PdfMappingContent = { id: number; title: string; materialUrl: string | null };
export type PdfMappingFile = {
  fileName: string; url?: string; targetLesson?: number;
  targetKey?: string; targetContentIds?: number[];
  expectedContentIds?: number[];
};
export type PdfMappingTarget = {
  key: string; label: string; lesson: number | null;
  contentIds: number[]; contentCount: number; kind: "group" | "content";
};

const validLesson = (value: number) => Number.isInteger(value) && value >= 1 && value <= 999;
const compact = (value: string) => value.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").replace(/[^a-z0-9]/g, "");
const normalized = (value: string) => value.normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR")
  .replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ");

/** Identificador de grupo extraído apenas do começo do título. */
export function groupKeyFromContentTitle(title: string): string | null {
  const input = title.trim();
  const aula = /^(?:(?:[\p{L}\d][\p{L}\d\s/_-]{0,80})\s*[:|–—-]\s*)?aula\s*0*(\d{1,3})(?=\s|[-–—.:|]|$)/iu.exec(input);
  if (aula) {
    const n = Number(aula[1]);
    if (!validLesson(n)) return null;
    const refs = [...input.matchAll(/\baula\s*0*(\d{1,3})(?=\s|[-–—.:|]|$)/gi)];
    if (refs.some(item => Number(item[1]) !== n)) return null;
    return "aula:" + n;
  }
  // "RLM 2.1", "Direito Penal 3.5" etc. Inclui o prefixo e o módulo
  // para que duas sequências 2.1 e 3.1 não compartilhem o PDF.
  const topic = /^(?<prefix>[\p{L}][\p{L}\d\s/-]{0,80}\s+)?(\d{1,3})\.(\d{1,3})(?=\s|[·—–:.-]|$)/iu.exec(input);
  if (!topic) return null;
  const moduleNo = Number(topic[2]), itemNo = Number(topic[3]);
  if (!validLesson(moduleNo) || !validLesson(itemNo)) return null;
  const refs = [...input.matchAll(/\b(\d{1,3})\.(\d{1,3})\b/g)];
  if (refs.some(item => Number(item[1]) !== moduleNo || Number(item[2]) !== itemNo)) return null;
  return "tema:" + (compact(topic.groups?.prefix ?? "") || "geral") + ":" + moduleNo + "." + itemNo;
}
export function lessonNumberFromContentTitle(title: string): number | null {
  const key = groupKeyFromContentTitle(title);
  if (!key) return null;
  const last = key.startsWith("aula:") ? key.slice(5) : key.split(".").at(-1) ?? "";
  const n = Number(last);
  return validLesson(n) ? n : null;
}
function disciplineAliases(shortName?: string, name?: string): Set<string> {
  const aliases = new Set([compact(shortName ?? ""), compact(name ?? "")].filter(Boolean));
  if (name) {
    const words = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .split(/[^A-Za-z]+/).filter(Boolean)
      .filter(word => !["de", "da", "do", "dos", "das", "e", "em", "para"].includes(word.toLowerCase()));
    if (words.length > 1) aliases.add(words.map(word => word[0].toLowerCase()).join(""));
  }
  return aliases;
}
export function lessonNumberFromPdfName(fileName: string): number | null {
  const stem = fileName.replace(/\.pdf$/i, "").trim();
  if (stem === fileName || /[/\\]/.test(fileName)) return null;
  const m = /^(?:(?:[\p{L}][\p{L}\d\s-]{0,70})[_\s-]+)?aula[_\s-]*0*(\d{1,3})(?:\s*[-–—:]\s*.+)?$/iu.exec(stem);
  const n = m ? Number(m[1]) : NaN;
  return validLesson(n) ? n : null;
}
function pdfHint(fileName: string) {
  const stem = fileName.replace(/\.pdf$/i, "").trim(), exact = normalized(stem);
  if (stem === fileName || /[/\\]/.test(fileName)) return { key: null as string | null, lesson: null as number | null, prefix: null as string | null, exact };
  const numbered = /^(?:(?<prefix>[\p{L}][\p{L}\d\s-]{0,70})[_\s-]+)?aula[_\s-]*0*(?<lesson>\d{1,3})(?:\s*[-–—:]\s*.+)?$/iu.exec(stem);
  if (numbered) {
    const n = Number(numbered.groups?.lesson);
    if (validLesson(n)) return { key: "aula:" + n, lesson: n, prefix: numbered.groups?.prefix ?? null, exact };
  }
  const topic = /^(?<prefix>[\p{L}][\p{L}\d\s/-]{0,80})\s+(?<module>\d{1,3})\.(?<item>\d{1,3})(?=\s|[·—–:.-]|$)/iu.exec(stem);
  if (topic) {
    const moduleNo = Number(topic.groups?.module), itemNo = Number(topic.groups?.item);
    if (validLesson(moduleNo) && validLesson(itemNo))
      return { key: "tema:" + (compact(topic.groups?.prefix ?? "") || "geral") + ":" + moduleNo + "." + itemNo, lesson: itemNo, prefix: topic.groups?.prefix ?? null, exact };
  }
  return { key: null as string | null, lesson: null as number | null, prefix: null as string | null, exact };
}
/** Grupos estruturados mais cada conteúdo individual como destino manual. */
export function listPdfMappingTargets(contents: PdfMappingContent[]): PdfMappingTarget[] {
  const groups = new Map<string, PdfMappingTarget>();
  for (const content of contents) {
    const key = groupKeyFromContentTitle(content.title);
    if (!key) continue;
    const existing = groups.get(key);
    const label = key.startsWith("aula:")
      ? "Aula " + String(lessonNumberFromContentTitle(content.title)).padStart(2, "0")
      : "Tema " + key.slice(key.lastIndexOf(":") + 1) + " (" + key.slice(5, key.lastIndexOf(":")) + ")";
    if (existing) { existing.contentIds.push(content.id); existing.contentCount += 1; }
    else groups.set(key, { key, label, lesson: lessonNumberFromContentTitle(content.title), contentIds: [content.id], contentCount: 1, kind: "group" });
  }
  const targets = [...groups.values()];
  for (const content of contents) targets.push({
    key: "content:" + content.id, label: "Conteúdo: " + content.title,
    lesson: lessonNumberFromContentTitle(content.title), contentIds: [content.id], contentCount: 1, kind: "content",
  });
  return targets;
}

export function mapPdfFilesToContents(input: {
  files: PdfMappingFile[]; contents: PdfMappingContent[];
  replaceExisting: boolean; disciplineShortName?: string; disciplineName?: string;
}) {
  if (!input.files.length || input.files.length > 100) throw new Error("Selecione de 1 a 100 apostilas por lote.");
  const ids = new Set(input.contents.map(content => content.id));
  const byId = new Map(input.contents.map(content => [content.id, content] as const));
  const availableTargets = listPdfMappingTargets(input.contents);
  const targetByKey = new Map(availableTargets.map(target => [target.key, target] as const));
  const grouped = availableTargets.filter(target => target.kind === "group");
  const aliases = disciplineAliases(input.disciplineShortName, input.disciplineName);
  const seenFiles = new Set<string>(), seenContents = new Map<number, string>();
  const mappings = input.files.map(file => {
    const fileName = file.fileName.trim();
    if (!/\.pdf$/i.test(fileName) || /[/\\]/.test(fileName) || fileName.length > 180)
      throw new Error("Arquivo inválido: " + fileName);
    const fileKey = fileName.toLocaleLowerCase("pt-BR");
    if (seenFiles.has(fileKey)) throw new Error("Arquivo duplicado no lote: " + fileName);
    seenFiles.add(fileKey);
    const hint = pdfHint(fileName);
    let selected: PdfMappingTarget | null = null;
    let matchMode: "automatic" | "manual" | "unmatched" = "unmatched";
    let reason = "Sem correspondência automática. Escolha uma aula ou conteúdos na tabela.";
    if (file.targetContentIds?.length) {
      const values = [...new Set(file.targetContentIds)];
      if (values.some(id => !Number.isInteger(id) || !ids.has(id)))
        throw new Error("O destino de " + fileName + " contém conteúdo fora da disciplina selecionada.");
      selected = { key: "manual:" + fileName, label: "Conteúdos selecionados", lesson: null,
        contentIds: values, contentCount: values.length, kind: "content" };
      matchMode = "manual";
    } else if (file.targetKey) {
      selected = targetByKey.get(file.targetKey) ?? null;
      if (!selected) throw new Error("Destino de " + fileName + " não encontrado nesta disciplina. Refaça a conferência.");
      matchMode = "manual";
    } else if (file.targetLesson !== undefined) {
      const candidates = grouped.filter(target => target.lesson === file.targetLesson);
      if (candidates.length === 1) { selected = candidates[0]; matchMode = "manual"; }
      else reason = candidates.length ? "Aula ambígua. Escolha o destino exato." : "Aula indicada não existe nesta disciplina.";
    } else {
      const exact = input.contents.filter(content => normalized(content.title) === hint.exact);
      const validPrefix = !hint.prefix || !aliases.size || aliases.has(compact(hint.prefix));
      const isAnswerKey = /\b(gabarito|resolu[cç][aã]o|respostas|correc[aã]o)\b/i.test(fileName);
      if (isAnswerKey) reason = "O nome sugere gabarito ou correção. Confirme o destino manualmente.";
      else if (!validPrefix) reason = "Prefixo diferente da disciplina. Confirme o destino manualmente.";
      else if (hint.key && targetByKey.has(hint.key)) {
        selected = targetByKey.get(hint.key) ?? null; matchMode = "automatic";
      } else if (hint.lesson) {
        const candidates = grouped.filter(target => target.lesson === hint.lesson);
        if (candidates.length === 1) { selected = candidates[0]; matchMode = "automatic"; }
        else reason = candidates.length ? "Número de aula ambíguo. Escolha um destino." : "Número de aula não encontrado nesta disciplina.";
      } else if (exact.length === 1) {
        selected = targetByKey.get("content:" + exact[0].id) ?? null; matchMode = "automatic";
      } else if (exact.length > 1) reason = "Há conteúdos com o mesmo título. Selecione manualmente.";
    }
    const matched = selected?.contentIds.map(id => byId.get(id)!).filter(Boolean) ?? [];
    for (const content of matched) {
      const other = seenContents.get(content.id);
      if (other) throw new Error("Os PDFs " + other + " e " + fileName + " apontam para o mesmo conteúdo.");
      seenContents.set(content.id, fileName);
    }
    const eligible = input.replaceExisting ? matched : matched.filter(row => !row.materialUrl);
    return {
      fileName, targetKey: selected?.key ?? null, lesson: selected?.lesson ?? hint.lesson,
      matchMode, reason: selected ? null : reason,
      matchedContents: matched.length, toAssociate: eligible.length,
      alreadyHasPdf: matched.length - eligible.length,
      contentIds: eligible.map(row => row.id),
      contents: matched.map(row => ({ id: row.id, title: row.title, hasPdf: Boolean(row.materialUrl) })),
    };
  });
  const unmatched = mappings.filter(item => item.matchedContents === 0).map(item => item.fileName);
  const totalAssociations = mappings.reduce((sum, item) => sum + item.toAssociate, 0);
  const availableLessons = grouped.reduce<{ lesson: number; contentCount: number }[]>((out, target) => {
    if (target.lesson !== null && !out.some(item => item.lesson === target.lesson))
      out.push({ lesson: target.lesson, contentCount: target.contentCount });
    return out;
  }, []).sort((a, b) => a.lesson - b.lesson);
  const availableContents = input.contents.map(row => ({ id: row.id, title: row.title, hasPdf: Boolean(row.materialUrl) }));
  return { mappings, unmatched, totalAssociations, totalFiles: mappings.length,
    availableLessons, availableTargets, availableContents };
}
