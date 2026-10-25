export type ReviewRating = "again" | "hard" | "good" | "easy";
export type ReviewSchedule = {
  intervalDays: number;
  repetitions: number;
  ease: number;
  dueAt: string;
  lastReviewedAt: string | null;
};
export const initialReviewSchedule = (now = new Date()): ReviewSchedule => ({
  intervalDays: 0, repetitions: 0, ease: 2.5, dueAt: now.toISOString(), lastReviewedAt: null,
});
/** Agendamento determinístico de recuperação ativa: 1, 3, 7, 14, 30 dias
 * com espaçamento adicional baseado na qualidade do acerto. A nota "again"
 * reinicia a retenção sem apagar o histórico do aluno. */
export function scheduleReview(previous: ReviewSchedule, rating: ReviewRating, now = new Date()): ReviewSchedule {
  const safeEase = Math.min(3, Math.max(1.3, Number.isFinite(previous.ease) ? previous.ease : 2.5));
  const repetitions = rating === "again" ? 0 : previous.repetitions + 1;
  const ease = Math.min(3, Math.max(1.3, safeEase + (rating === "easy" ? .15 : rating === "hard" ? -.18 : rating === "again" ? -.2 : 0)));
  let intervalDays: number;
  if (rating === "again") intervalDays = 1;
  else if (rating === "hard") intervalDays = Math.max(1, Math.round(Math.max(previous.intervalDays, 1) * 1.3));
  else if (previous.repetitions === 0) intervalDays = rating === "easy" ? 3 : 1;
  else if (previous.repetitions === 1) intervalDays = rating === "easy" ? 7 : 3;
  else intervalDays = Math.min(365, Math.max(1, Math.round(previous.intervalDays * ease * (rating === "easy" ? 1.25 : 1))));
  return {
    intervalDays, repetitions, ease,
    dueAt: new Date(now.getTime() + intervalDays * 86_400_000).toISOString(),
    lastReviewedAt: now.toISOString(),
  };
}
export function isReviewDue(review: ReviewSchedule, now = new Date()) {
  return Date.parse(review.dueAt) <= now.getTime();
}
