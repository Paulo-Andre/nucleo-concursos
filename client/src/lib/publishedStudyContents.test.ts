import { describe, expect, it } from "vitest";
import { filterPublishedStudyContents, type PublishedStudyContent } from "./publishedStudyContents";

const contents: PublishedStudyContent[] = [
  { id: 5, title: "Interpretação e acentuação", disciplineName: "Português", description: null, cardText: "Língua portuguesa", objective: null, progress: { status: "started" } },
  { id: 6, title: "Atos administrativos", disciplineName: "Direito", description: "Servidores e atos", cardText: null, objective: null, progress: { status: "completed" } },
  { id: 7, title: "Concordância nominal", disciplineName: "Português", description: null, cardText: null, objective: null, progress: null },
];

describe("biblioteca persistida do aluno", () => {
  it("permite filtrar por conteúdo, disciplina, acentos e situação simultaneamente", () => {
    const selected = filterPublishedStudyContents(contents, { search: "acentuacao", discipline: "Português", contentId: "5", status: "in-progress" });
    expect(selected.map(item => item.id)).toEqual([5]);
    expect(filterPublishedStudyContents(contents, { search: "", discipline: "Direito", contentId: "all", status: "completed" }).map(item => item.id)).toEqual([6]);
    expect(filterPublishedStudyContents(contents, { search: "", discipline: "Português", contentId: "all", status: "not-started" }).map(item => item.id)).toEqual([7]);
    expect(filterPublishedStudyContents(contents, { search: "", discipline: "Português", contentId: "6", status: "all" })).toEqual([]);
  });
});
