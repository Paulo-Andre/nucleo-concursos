/** Correspondência explícita entre os nomes de PDFs PT_Aula_01.pdf e títulos
 * "Aula 01 - ..." da planilha de importação de conteúdos.
 * Escopo de disciplina obrigatório: não associa matérias distintas com Aula 01.
 */
export type PdfMappingContent = { id: number; title: string; materialUrl: string | null };
export type PdfMappingFile = { fileName: string; url?: string };

export function lessonNumberFromContentTitle(title: string): number | null {
  const match = /^\s*aula\s+0*(\d{1,3})(?=\s|[-–—.:]|$)/i.exec(title);
  const n = match ? Number(match[1]) : NaN;
  return Number.isInteger(n) && n > 0 && n <= 999 ? n : null;
}
export function lessonNumberFromPdfName(fileName: string): number | null {
  // Exige formato completo, evitando anexar "Aula 01 - gabarito.pdf" sem querer.
  const match = /^(?:(?:pt|port|portugues)[_-])?aula[_\s-]*0*(\d{1,3})\.pdf$/i.exec(fileName.trim());
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
    const lesson = lessonNumberFromPdfName(file.fileName);
    if (lesson === null) throw new Error(`Nome de PDF não reconhecido: ${file.fileName}. Utilize PT_Aula_01.pdf, PT_Aula_02.pdf, etc.`);
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
    };
  });
  const unmatched = mappings.filter(item => item.matchedContents === 0);
  const totalAssociations = mappings.reduce((sum, item) => sum + item.toAssociate, 0);
  return { mappings, unmatched: unmatched.map(item => item.fileName), totalAssociations, totalFiles: mappings.length };
}
