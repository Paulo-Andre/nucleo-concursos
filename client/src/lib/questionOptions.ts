/** Normaliza alternativas digitadas ou coladas, preservando a primeira ocorrência e removendo duplicatas. */
export function normalizeQuestionOptions(rawValue: string) {
  return Array.from(new Set(
    rawValue
      .replace(/\\n/g, "\n")
      .split(/\r?\n/)
      .map(option => option.trim())
      .filter(Boolean),
  ));
}
