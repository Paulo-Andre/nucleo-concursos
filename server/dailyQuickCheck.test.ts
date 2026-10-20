import { describe, expect, it } from "vitest";
import { dailyCheckHistoryKey, dailyCheckShownIds, recordDailyCheckSelection, selectDailyQuickCheckQuestion, type DailyQuickCheckCandidate } from "./dailyQuickCheck";

const candidates: DailyQuickCheckCandidate[] = [
  { id: 1, questionType: "certo_errado", difficulty: "advanced", statement: "Questão longa e avançada.".repeat(30) },
  { id: 2, questionType: "certo_errado", difficulty: "basic", statement: "Pergunta curta 2." },
  { id: 3, questionType: "certo_errado", difficulty: "basic", statement: "Pergunta curta 3." },
  { id: 4, questionType: "multipla_escolha", difficulty: "basic", statement: "Alternativa múltipla." },
];

describe("seleção da checagem diária", () => {
  it("seleciona itens C/E de forma estável no mesmo curso e dia, independentemente da dificuldade", () => {
    const input = { questions: candidates, userId: 73, courseId: "pf-agente", day: "2026-08-19", recentQuestionIds: [] };
    const first = selectDailyQuickCheckQuestion(input);
    const second = selectDailyQuickCheckQuestion(input);
    expect(first?.id).toBe(second?.id);
    expect([1, 2, 3]).toContain(first?.id);
  });

  it("evita questões respondidas recentemente quando o curso oferece outra opção", () => {
    const initial = selectDailyQuickCheckQuestion({ questions: candidates, userId: 73, courseId: "pf-agente", day: "2026-08-19", recentQuestionIds: [] });
    const replacement = selectDailyQuickCheckQuestion({ questions: candidates, userId: 73, courseId: "pf-agente", day: "2026-08-19", recentQuestionIds: [String(initial?.id)] });
    expect(replacement?.id).not.toBe(initial?.id);
    expect([1, 2, 3]).toContain(replacement?.id);
  });

  it("permite excluir a questão diária anterior quando o aluno a dispensou", () => {
    const selected = selectDailyQuickCheckQuestion({ questions: candidates, userId: 19, courseId: "pf-agente", day: "2026-08-20", recentQuestionIds: ["2"] });
    expect(selected?.id).not.toBe(2);
    expect([1, 3]).toContain(selected?.id);
  });


  it("percorre todas as perguntas elegíveis antes de repetir, mesmo quando o aluno dispensou a checagem", () => {
    const pool = Array.from({ length: 8 }, (_, index) => ({
      id: index + 101,
      questionType: "certo_errado" as const,
      difficulty: "intermediate" as const,
      statement: `Checagem diferente ${index + 1}.`,
    }));
    let usedQuestionIds: string[] = ["sim-legacy-123"];
    const ids: number[] = [];
    for (let offset = 0; offset < pool.length; offset += 1) {
      const shownQuestionIds = dailyCheckShownIds("pf-agente", usedQuestionIds);
      const question = selectDailyQuickCheckQuestion({
        questions: pool, userId: 24, courseId: "pf-agente", day: `2026-10-${String(offset + 1).padStart(2, "0")}`,
        recentQuestionIds: ids.slice(-2).map(String), shownQuestionIds,
      });
      expect(question).not.toBeNull();
      expect(ids).not.toContain(question!.id);
      ids.push(question!.id);
      usedQuestionIds = recordDailyCheckSelection({
        courseId: "pf-agente", questionId: question!.id, usedQuestionIds,
        resetCycle: shownQuestionIds.length === pool.length,
      });
    }
    expect(ids).toHaveLength(pool.length);
    expect(new Set(ids).size).toBe(pool.length);
    expect(usedQuestionIds).toContain("sim-legacy-123");
    expect(dailyCheckShownIds("outro-curso", usedQuestionIds)).toEqual([]);

    const shown = dailyCheckShownIds("pf-agente", usedQuestionIds);
    const next = selectDailyQuickCheckQuestion({
      questions: pool, userId: 24, courseId: "pf-agente", day: "2026-10-09",
      recentQuestionIds: [String(ids.at(-1))], shownQuestionIds: shown,
    });
    expect(next?.id).not.toBe(ids.at(-1));
    usedQuestionIds = recordDailyCheckSelection({ courseId: "pf-agente", questionId: next!.id, usedQuestionIds, resetCycle: true });
    expect(dailyCheckShownIds("pf-agente", usedQuestionIds)).toEqual([String(next!.id)]);
    expect(usedQuestionIds).toContain("sim-legacy-123");
  });

  it("usa os IDs por curso sem confundir históricos de cursos diferentes", () => {
    const records = ["123", dailyCheckHistoryKey("curso-a", 7), dailyCheckHistoryKey("curso-b", 8)];
    expect(dailyCheckShownIds("curso-a", records)).toEqual(["7"]);
    expect(dailyCheckShownIds("curso-b", records)).toEqual(["8"]);
    expect(recordDailyCheckSelection({courseId:"curso-a",questionId:9,usedQuestionIds:records,resetCycle:true}))
      .toEqual(["123", dailyCheckHistoryKey("curso-b", 8), dailyCheckHistoryKey("curso-a", 9)]);
  });

  it("retorna a única questão disponível sem travar a checagem", () => {
    const one = [candidates[2]];
    const q = selectDailyQuickCheckQuestion({
      questions: one, userId: 1, courseId: "pf-agente", day: "2026-10-05",
      recentQuestionIds: ["3"], shownQuestionIds: ["3"],
    });
    expect(q?.id).toBe(3);
  });

  it("retorna nulo se não houver item C/E elegível", () => {
    expect(selectDailyQuickCheckQuestion({ questions: [candidates[3]], userId: 1, courseId: "pf-agente", day: "2026-08-19", recentQuestionIds: [] })).toBeNull();
  });
});
