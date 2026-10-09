import { describe, expect, it } from "vitest";
import { filterStudyLibrary, normalizeStudySearch } from "./studyLibraryFilters";

const modules = [
  { id: "one", code: "A1", title: "Língua Portuguesa", summary: "Interpretação", discipline: "Português" },
  { id: "two", code: "A2", title: "Raciocínio Lógico", summary: "Conjuntos", discipline: "Matemática" },
  { id: "three", code: "A3", title: "Direito Constitucional", summary: "Direitos fundamentais", discipline: "Direito" },
];
const completed = (module: typeof modules[number]) => module.id === "one";
const started = (module: typeof modules[number]) => module.id === "two";

describe("filtros da biblioteca de estudos", () => {
  it("pesquisa ignorando acentos e maiúsculas", () => {
    expect(normalizeStudySearch("  LÓGICO  ")).toBe("logico");
    expect(filterStudyLibrary(modules, "portugues", "all", completed, started).map(item => item.id)).toEqual(["one"]);
  });
  it("distingue concluídos e aulas em andamento sem inventar progresso", () => {
    expect(filterStudyLibrary(modules, "", "completed", completed, started).map(item => item.id)).toEqual(["one"]);
    expect(filterStudyLibrary(modules, "", "in-progress", completed, started).map(item => item.id)).toEqual(["two"]);
  });
  it("combina disciplina, conteúdo selecionado, texto e progresso", () => {
    expect(filterStudyLibrary(modules, "", "all", completed, started, module => module.discipline, { discipline: "Português" }).map(item => item.id)).toEqual(["one"]);
    expect(filterStudyLibrary(modules, "", "all", completed, started, module => module.discipline, { contentId: "two" }).map(item => item.id)).toEqual(["two"]);
    expect(filterStudyLibrary(modules, "lógico", "in-progress", completed, started, module => module.discipline, { discipline: "Matemática", contentId: "two" }).map(item => item.id)).toEqual(["two"]);
    expect(filterStudyLibrary(modules, "", "completed", completed, started, module => module.discipline, { discipline: "Direito" })).toEqual([]);
    expect(filterStudyLibrary(modules, "", "all", completed, started, module => module.discipline, { discipline: "Português", contentId: "two" })).toEqual([]);
  });

  it("mantém a ordem original e permite pesquisar por disciplina", () => {
    expect(filterStudyLibrary(modules, "direito", "all", completed, started).map(item => item.id)).toEqual(["three"]);
    expect(filterStudyLibrary(modules, "", "all", completed, started).map(item => item.id)).toEqual(["one", "two", "three"]);
  });
});
