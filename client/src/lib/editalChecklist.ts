export type EdictChecklistContent = {
  id: number;
  title: string;
  disciplineName: string;
  progress: { status: "started" | "completed" } | null;
};

export type EdictChecklistDiscipline = {
  name: string;
  completed: number;
  started: number;
  notStarted: number;
  total: number;
  percent: number;
  contents: Array<EdictChecklistContent & { status: "started" | "completed" | "not-started" }>;
};

/**
 * A cobertura é calculada somente sobre aulas publicadas/vinculadas ao curso na API.
 * Não assume que conteúdos ausentes da biblioteca representam 100% do edital oficial.
 */
export function buildEdictChecklist<T extends EdictChecklistContent>(items: T[]): EdictChecklistDiscipline[] {
  const groups = new Map<string, EdictChecklistDiscipline>();
  for (const item of items) {
    const name = item.disciplineName.trim() || "Sem disciplina";
    let group = groups.get(name);
    if (!group) {
      group = { name, completed: 0, started: 0, notStarted: 0, total: 0, percent: 0, contents: [] };
      groups.set(name, group);
    }
    const status = item.progress?.status === "completed" ? "completed"
      : item.progress?.status === "started" ? "started" : "not-started";
    group[status === "completed" ? "completed" : status === "started" ? "started" : "notStarted"] += 1;
    group.total += 1;
    group.contents.push({ ...item, status });
  }
  return Array.from(groups.values())
    .map(group => ({ ...group, percent: group.total ? Math.round(100 * group.completed / group.total) : 0,
      contents: group.contents.sort((a, b) => a.title.localeCompare(b.title, "pt-BR")) }))
    .sort((a, b) => a.percent - b.percent || a.name.localeCompare(b.name, "pt-BR"));
}
