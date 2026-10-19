import { normalizeStudySearch } from "./studyLibraryFilters";

export type PublishedStudyContent = {
  id: number;
  title: string;
  disciplineName: string;
  cardText: string | null;
  description: string | null;
  objective: string | null;
  progress: { status: "started" | "completed" } | null;
};

export type PublishedContentFilter = {
  search: string;
  discipline: string;
  contentId: string;
  status: "all" | "in-progress" | "completed" | "not-started";
};

export function filterPublishedStudyContents<T extends PublishedStudyContent>(
  contents: T[],
  filters: PublishedContentFilter,
  legacyCompletedIds: Set<number> = new Set(),
): T[] {
  const needle = normalizeStudySearch(filters.search);
  return contents.filter(content => {
    const completed = content.progress?.status === "completed" || legacyCompletedIds.has(content.id);
    const started = content.progress?.status === "started" && !completed;
    if (filters.discipline !== "all" && content.disciplineName !== filters.discipline) return false;
    if (filters.contentId !== "all" && String(content.id) !== filters.contentId) return false;
    if (filters.status === "completed" && !completed) return false;
    if (filters.status === "in-progress" && !started) return false;
    if (filters.status === "not-started" && (completed || started)) return false;
    return !needle || [content.title, content.disciplineName, content.cardText, content.description, content.objective]
      .some(value => normalizeStudySearch(value ?? "").includes(needle));
  });
}
