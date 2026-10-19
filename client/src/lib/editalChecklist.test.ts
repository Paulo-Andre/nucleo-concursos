import { describe, expect, it } from "vitest";
import { buildEdictChecklist } from "./editalChecklist";

const items = [
  { id: 1, title: "Interpretação", disciplineName: "Português", progress: { status: "completed" as const } },
  { id: 2, title: "Crase", disciplineName: "Português", progress: { status: "started" as const } },
  { id: 3, title: "Direito administrativo", disciplineName: "Direito", progress: null },
  { id: 4, title: "Redação", disciplineName: "Português", progress: null },
];

describe("checklist dos conteúdos publicados", () => {
  it("agrupa por disciplina e destaca pendências antes de disciplinas concluídas", () => {
    const result = buildEdictChecklist(items);
    expect(result).toHaveLength(2);
    expect(result.find(group => group.name === "Português")).toMatchObject({ total: 3, completed: 1, started: 1, notStarted: 1, percent: 33 });
    expect(result.find(group => group.name === "Direito")).toMatchObject({ total: 1, completed: 0, started: 0, notStarted: 1, percent: 0 });
  });
  it("não inventa cobertura quando não existem aulas", () => {
    expect(buildEdictChecklist([])).toEqual([]);
  });
});
