import { appRouter } from "./routers";
import { deleteStudyContentProgressByScope, getUserByUsername } from "./db";
import type { TrpcContext } from "./_core/context";
import { describe, expect, it } from "vitest";

describe("continuidade e roteiro semanal", () => {
  it("registra a abertura de uma aula e cria um roteiro privado para a conta ROOT", async () => {
    const root = await getUserByUsername("paulo");
    expect(root).toMatchObject({ username: "paulo", role: "admin" });
    if (!root) return;

    const context: TrpcContext = {
      user: root,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(context);
    const courseId = "pf-agente";
    const initial = await caller.study.contentProgress.get({ courseId });
    const content = initial.contents[0];
    expect(content).toBeTruthy();
    if (!content) return;
    let roadmapId: number | null = null;

    try {
      const opened = await caller.study.contentProgress.open({ courseId, contentId: content.id });
      expect(opened.continueItem).toMatchObject({ id: content.id, progress: { status: "started" } });

      const roadmap = await caller.study.roadmap.save({ courseId, contentId: content.id, weekday: 2, startTime: "19:30", isActive: true });
      const item = roadmap.find(entry => entry.contentId === content.id);
      expect(item).toMatchObject({ weekday: 2, startTime: "19:30", content: { id: content.id } });
      roadmapId = item?.id ?? null;
    } finally {
      if (roadmapId) await caller.study.roadmap.remove({ id: roadmapId });
      await deleteStudyContentProgressByScope(root.id, courseId, content.id);
    }
  });
});
