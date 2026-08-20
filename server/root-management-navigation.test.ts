import { describe, expect, it } from "vitest";
import { rootManagementSections } from "../client/src/lib/rootManagementNavigation";

describe("navegação unificada da gestão ROOT", () => {
  it("mantém áreas distintas para negócios, alunos, conteúdos e contatos", () => {
    expect(rootManagementSections.map((section) => section.id)).toEqual([
      "business",
      "students",
      "contents",
      "contacts",
    ]);
  });

  it("mantém descrições operacionais para orientar cada área administrativa", () => {
    for (const section of rootManagementSections) {
      expect(section.label).not.toHaveLength(0);
      expect(section.description.length).toBeGreaterThan(12);
    }
  });
});
