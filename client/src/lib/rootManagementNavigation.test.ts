import { describe, expect, it } from "vitest";
import { rootManagementGroups, rootManagementSections } from "./rootManagementNavigation";

describe("navegação administrativa", () => {
  it("organiza cada área existente uma vez, sem inventar rotas", () => {
    const listed = rootManagementGroups.flatMap(group => group.sections.map(section => section.id));
    const original = rootManagementSections.map(section => section.id);
    expect(listed.sort()).toEqual(original.sort());
    expect(new Set(listed).size).toBe(original.length);
  });

  it("usa grupos coerentes com as responsabilidades atuais", () => {
    expect(rootManagementGroups.find(group => group.label === "Operação")?.sections.map(item => item.id)).toEqual(["business", "students"]);
    expect(rootManagementGroups.find(group => group.label === "Ensino")?.sections.map(item => item.id)).toEqual(["courses", "contents", "competition"]);
  });
});
