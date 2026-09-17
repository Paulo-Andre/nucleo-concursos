import { describe, expect, it } from "vitest";
import type { TrpcContext } from "./_core/context";
import { getUserByUsername } from "./db";
import { appRouter } from "./routers";
describe("importação persistida PF 2018", () => {
  it("entrega os itens importados e seus vínculos à listagem administrativa ROOT", async () => {
    const root = await getUserByUsername("paulo");
    expect(root).toMatchObject({ username: "paulo", role: "admin" });
    if (!root) return;
    const context: TrpcContext = {
      user: root,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const listedQuestions = await appRouter.createCaller(context).admin.questions.list({});
    const importedQuestions = listedQuestions.filter(question => question.source?.startsWith("PROVA_PF_2018:item_"));

    expect(importedQuestions).toHaveLength(120);
    expect(importedQuestions.every(question => question.contentIds.length > 0)).toBe(true);
    expect(importedQuestions.find(question => question.source?.startsWith("PROVA_PF_2018:item_58"))?.statement).toContain("1/30");
  });
});
