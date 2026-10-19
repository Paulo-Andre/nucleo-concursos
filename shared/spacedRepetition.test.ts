import { describe, expect, it } from "vitest";
import { initialReviewSchedule, scheduleReview, isReviewDue } from "./spacedRepetition";
describe("revisão espaçada", () => {
 const now = new Date("2026-10-19T12:00:00Z");
 it("espaça 1, 3, 7 dias para acertos progressivos", () => {
   const a = scheduleReview(initialReviewSchedule(now), "good", now);
   const b = scheduleReview(a, "good", new Date(a.dueAt));
   const c = scheduleReview(b, "easy", new Date(b.dueAt));
   expect([a.intervalDays, b.intervalDays]).toEqual([1,3]);
   expect(c.intervalDays).toBeGreaterThanOrEqual(7);
   expect(isReviewDue(a, new Date(a.dueAt))).toBe(true);
 });
 it("reinicia sequência após erro e nunca agenda data anterior", () => {
   const a = scheduleReview(scheduleReview(initialReviewSchedule(now),"good",now),"again",now);
   expect(a.repetitions).toBe(0);
   expect(a.intervalDays).toBe(1);
   expect(a.ease).toBeGreaterThanOrEqual(1.3);
 });
});
