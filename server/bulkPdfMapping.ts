/** Associação por aula e por disciplina.
 * Português: PT_Aula_01.pdf + títulos "Aula 01 - ...".
 * Raciocínio Lógico-Matemático: RLM_Aula_01.pdf + títulos "RLM 2.1 · ...".
 * A seleção da disciplina limita a pesquisa às aulas corretas.
 */
export type PdfMappingContent = { id: number; title: string; materialUrl: string | null };
export type PdfMappingFile = { fileName: string; url?: string; targetLesson?: number };

export function lessonNumberFromContentTitle(title: string): number | null {
  const normalized = title.trim();

  // Reconhece as dez divisões de cada tema do material PCMG.
  const rlm = /^RLM\s+2\.(\d{1,2})(?=\s|[·—–:.-]|$)/i.exec(normalized);
  if (rlm) {
    const lesson = Number(rlm[1]);
    const references = Array.from(normalized.matchAll(/\bRLM\s+2\.(\d{1,2})\b/gi));
    if (references.some(match => Number(match[1]) !== lesson)) return null;
    return lesson > 0 && lesson <= 999 ? lesson : null;
  }

  // Mantém a regra existente das aulas de Português.
  const prefix = /^(?:(?:(?:pcmg\s+)?(?:portugu[eê]?s|língua portuguesa)|módulo\s*\d+)\s*[:|–—-]\s*)?aula\s*0*(\d{1,3})(?=\s|[-–—.:|]|$)/i.exec(normalized);
  if (!prefix) return null;
  const lesson = Number(prefix[1]);
  if (!Number.isInteger(lesson) || lesson < 1 || lesson > 999) return null;
  const references = Array.from(normalized.matchAll(/\baula\s*0*(\d{1,3})(?=\s|[-–—.:|]|$)/gi));
  if (references.some(match => Number(match[1]) !== lesson)) return null;
  return lesson;
}

function compactPrefix(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/gi, "").toLowerCase();
}
function acceptedPdfPrefixes(shortName: string) {
  const code = compactPrefix(shortName);
  if (["rlm", "rlmt"].includes(code)) return ["rlm", "rlmt"];
  if (["pt", "port", "portugues", "linguaportuguesa"].includes(code))
    return ["pt", "port", "portugues", "linguaportuguesa"];
  return [code];
}
export function lessonNumberFromPdfName(fileName: string, disciplineShortName?: string): number | null {
  // Nomes exatos, sem subtítulos, evitando associar PDFs de gabaritos.
  const match = /^(?:([a-z][a-z0-9-]*)[_-])?aula[_\s-]*0*(\d{1,3})\.pdf$/i.exec(fileName.trim());
  if (!match) return null;
  const filePrefix = match[1] ? compactPrefix(match[1]) : "";
  if (filePrefix && disciplineShortName && !acceptedPdfPrefixes(disciplineShortName).includes(filePrefix)) return null;
  const lesson = Number(match[2]);
  return Number.isInteger(lesson) && lesson > 0 && lesson <= 999 ? lesson : null;
}

export function mapPdfFilesToContents(input: {
  files: PdfMappingFile[];
  contents: PdfMappingContent[];
  replaceExisting: boolean;
  disciplineShortName?: string;
}) {
  if (!input.files.length || input.files.length > 100) throw new Error("Selecione de 1 a 100 apostilas por lote.");
  const seen = new Set<number>();
  const mappings = input.files.map(file => {
    const inferredLesson = lessonNumberFromPdfName(file.fileName, input.disciplineShortName);
    const lesson = file.targetLesson ?? inferredLesson;
    // Um prefixo explicitamente diferente da disciplina não pode ser contornado
    // pela escolha manual da aula de destino.
    const explicitPrefix = /^([a-z][a-z0-9-]*)[_-]aula/i.exec(file.fileName)?.[1];
    if (explicitPrefix && input.disciplineShortName &&
        !acceptedPdfPrefixes(input.disciplineShortName).includes(compactPrefix(explicitPrefix))) {
      throw new Error('O prefixo do PDF não corresponde à disciplina selecionada: ' + file.fileName);
    }
    if (lesson === null || !Number.isInteger(lesson) || lesson < 1 || lesson > 999)
      throw new Error('Nome de PDF não reconhecido: ' + file.fileName + '. Use RLM_Aula_01.pdf para RLM ou PT_Aula_01.pdf para Português.');
    if (seen.has(lesson)) throw new Error('Mais de um PDF para a Aula ' + lesson + '. Deixe apenas uma versão por aula.');
    seen.add(lesson);
    const matched = input.contents.filter(row => lessonNumberFromContentTitle(row.title) === lesson);
    const eligible = input.replaceExisting ? matched : matched.filter(row => !row.materialUrl);
    return {
      fileName: file.fileName, lesson,
      matchedContents: matched.length,
      toAssociate: eligible.length,
      alreadyHasPdf: matched.length - eligible.length,
      contentIds: eligible.map(row => row.id),
      contents: matched.map(row => ({ id: row.id, title: row.title, hasPdf: Boolean(row.materialUrl) })),
    };
  });
  const unmatched = mappings.filter(item => item.matchedContents === 0);
  const totalAssociations = mappings.reduce((sum, item) => sum + item.toAssociate, 0);
  const availableLessons = Array.from(new Set(input.contents.map(item => lessonNumberFromContentTitle(item.title)).filter((lesson): lesson is number => lesson !== null)))
    .sort((a, b) => a - b)
    .map(lesson => ({ lesson, contentCount: input.contents.filter(item => lessonNumberFromContentTitle(item.title) === lesson).length }));
  return { mappings, unmatched: unmatched.map(item => item.fileName), totalAssociations, totalFiles: mappings.length, availableLessons };
}
