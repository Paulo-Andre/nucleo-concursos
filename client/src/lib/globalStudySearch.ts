import { normalizeStudySearch } from "./studyLibraryFilters";

export type SearchableLesson = { id: number; title: string; disciplineName: string; description?: string | null; objective?: string | null };
export type SearchableQuestion = { id: string; statement: string; discipline: string; subject: string; explanation?: string };
export type GlobalStudyResult =
  | { kind: "lesson"; id: number; title: string; detail: string }
  | { kind: "question"; id: string; title: string; detail: string };

export function searchStudyLibrary(
  text: string, lessons: SearchableLesson[], questions: SearchableQuestion[], limit = 20,
): GlobalStudyResult[] {
  const normalized = normalizeStudySearch(text);
  if (normalized.length < 2) return [];
  const matches = (value: string) => normalizeStudySearch(value).includes(normalized);
  const result: GlobalStudyResult[] = [];
  for (const item of lessons) {
    if (!matches([item.title, item.disciplineName, item.description, item.objective].filter(Boolean).join(" "))) continue;
    result.push({ kind: "lesson", id: item.id, title: item.title, detail: item.disciplineName });
    if (result.length >= limit) return result;
  }
  const used = new Set<string>();
  for (const item of questions) {
    if (used.has(item.id)) continue;
    used.add(item.id);
    if (!matches([item.statement, item.discipline, item.subject].join(" "))) continue;
    result.push({ kind: "question", id: item.id, title: item.statement, detail: `${item.discipline} · ${item.subject}` });
    if (result.length >= limit) break;
  }
  return result;
}
