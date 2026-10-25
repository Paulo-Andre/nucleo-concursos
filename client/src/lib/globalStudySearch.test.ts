import { describe, expect, it } from "vitest";
import { searchStudyLibrary } from "./globalStudySearch";

const lessons = [
  { id: 1, title: "Concordância nominal", disciplineName: "Português", description: null },
  { id: 2, title: "Atos administrativos", disciplineName: "Direito administrativo", description: null },
];
const questions = [
  { id: "central-1", statement: "A concordância verbal segue a pessoa do sujeito?", discipline: "Português", subject: "Morfossintaxe" },
  { id: "central-2", statement: "A Administração pode revogar atos legais?", discipline: "Direito administrativo", subject: "Atos" },
];

describe("busca única na biblioteca autorizada", () => {
  it("localiza aulas e questões ignorando acentuação", () => {
    const result = searchStudyLibrary("concordancia", lessons, questions);
    expect(result.map(item => item.kind)).toEqual(["lesson", "question"]);
  });
  it("não apresenta resultados para termo curto e respeita limite", () => {
    expect(searchStudyLibrary("a", lessons, questions)).toEqual([]);
    expect(searchStudyLibrary("administrativo", lessons, questions, 1)).toHaveLength(1);
  });
  it("não inclui itens não passados pela API de autorização", () => {
    expect(searchStudyLibrary("segredo", [], [])).toEqual([]);
  });
});
