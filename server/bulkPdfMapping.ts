/** Correspondência explícita entre PDFs PT_Aula_01.pdf / PCMG_Aula_01.pdf e títulos
 * "Aula 01 - ..." / "PCMG Português - Aula 01 - Parte 01 - ...".
 * Escopo de disciplina obrigatório: não associa matérias distintas com Aula 01.
 */
export type PdfMappingContent = { id: number; title: string; materialUrl: string | null };
export type PdfMappingFile = { fileName: string; url?: string; targetLesson?: number };

export function lessonNumberFromContentTitle(title: string): number | null {
  // Os títulos da Biblioteca Central variam: "Aula 01", "PCMG Português - Aula 01",
  // "Português PCMG | Aula 01" e códigos editoriais "PT-M01-A01".
  // Só reconhecer identificadores explícitos de aula; NÃO interpretar números de capítulo.
  const plain = title.trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const fromCode = /^(?:\[)?PT[-_ ]?M\d{1,3}[-_ ]?A0*(\d{1,3})(?!\d)/i.exec(plain);
  const fromStart = /^Aula[\s_-]*0*(\d{1,3})(?!\d)/i.exec(plain);
  const fromPrefix = /^(?:(?:PCMG|PC[-_ ]?MG)[\s_-]*)?(?:Lingua[\s_-]+Portuguesa|Portugues)(?:[\s\S]{0,100}?)\bAula[\s_-]*0*(\d{1,3})(?!\d)/i.exec(plain);
  // Títulos do tipo "PCMG - Aula 02" são aceitos apenas quando
  // a disciplina já foi escolhida: o filtro de disciplina é feito no servidor.
  const fromPCMG = /^(?:PCMG|PC[-_ ]?MG)[\s:_—–|-]+Aula[\s_-]*0*(\d{1,3})(?!\d)/i.exec(plain);
  const matched = fromCode || fromStart || fromPrefix || fromPCMG;
  const n = matched ? Number(matched[1]) : NaN;
  return Number.isInteger(n) && n > 0 && n <= 999 ? n : null;
}
export function lessonNumberFromPdfName(fileName: string): number | null {
  // Exige formato completo, evitando anexar "Aula 01 - gabarito.pdf" sem querer.
  const match = /^(?:(?:pt|port|portugues|pcmg)[_-])?aula[_\s-]*0*(\d{1,3})\.pdf$/i.exec(fileName.trim());
  const n = match ? Number(match[1]) : NaN;
  return Number.isInteger(n) && n > 0 && n <= 999 ? n : null;
}
export function mapPdfFilesToContents(input: {
  files: PdfMappingFile[];
  contents: PdfMappingContent[];
  replaceExisting: boolean;
}) {
  if (!input.files.length || input.files.length > 100) throw new Error("Selecione de 1 a 100 apostilas por lote.");
  const seen = new Set<number>();
  const mappings = input.files.map(file => {
    const inferredLesson = lessonNumberFromPdfName(file.fileName);
    const lesson = file.targetLesson ?? inferredLesson;
    if (lesson === null || !Number.isInteger(lesson) || lesson < 1 || lesson > 999) throw new Error(`Nome de PDF não reconhecido: ${file.fileName}. Utilize PT_Aula_01.pdf ou PCMG_Aula_01.pdf, etc.`);
    if (seen.has(lesson)) throw new Error(`Mais de um PDF para a Aula ${lesson}. Deixe apenas uma versão por aula.`);
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
  const unidentifiedTitles = input.contents.filter(row => lessonNumberFromContentTitle(row.title) === null).map(row => row.title);
  return { mappings, unmatched: unmatched.map(item => item.fileName), totalAssociations, totalFiles: mappings.length,
    availableLessons, identifiedContents: input.contents.length - unidentifiedTitles.length,
    unidentifiedCount: unidentifiedTitles.length, unidentifiedTitleExamples: unidentifiedTitles.slice(0, 12) };
}
