export type StudyLibraryFilter = "all" | "in-progress" | "completed";

export type StudyLibrarySelection = { discipline?: string; contentId?: string };

export type StudyLibraryItem = {
  id: string;
  code: string;
  title: string;
  summary: string;
  discipline: string;
};

export function normalizeStudySearch(text: string) {
  return text.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();
}

export function filterStudyLibrary<T extends StudyLibraryItem>(
  modules: T[],
  search: string,
  status: StudyLibraryFilter,
  isCompleted: (module: T) => boolean,
  isStarted: (module: T) => boolean,
  getDiscipline: (module: T) => string = module => module.discipline,
  selection: StudyLibrarySelection = {}
): T[] {
  const needle = normalizeStudySearch(search);
  return modules.filter(module => {
    if (selection.discipline && getDiscipline(module) !== selection.discipline) return false;
    if (selection.contentId && module.id !== selection.contentId) return false;
    const complete = isCompleted(module);
    const started = !complete && isStarted(module);
    if (status === "completed" && !complete) return false;
    if (status === "in-progress" && (complete || !started)) return false;
    if (!needle) return true;
    return [module.code, module.title, module.summary, module.discipline, getDiscipline(module)]
      .some(value => normalizeStudySearch(value).includes(needle));
  });
}
