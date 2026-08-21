export type SimulationSealTone = "gold" | "silver" | "bronze" | "teal" | "slate";

export type SimulationSealIdentity = {
  level: number;
  label: string;
  shortLabel: string;
  description: string;
  tone: SimulationSealTone;
  totalCorrect: number;
  nextLevelAt: number | null;
};

const CORRECT_ANSWERS_PER_SEAL = 20;
const MAXIMUM_SEALS = 10;

function sealTone(level: number): SimulationSealTone {
  if (level >= 10) return "gold";
  if (level >= 7) return "silver";
  if (level >= 4) return "bronze";
  if (level >= 1) return "teal";
  return "slate";
}

export function getSimulationSealIdentity(correctAnswers: number): SimulationSealIdentity {
  const totalCorrect = Math.max(0, Math.floor(correctAnswers));
  const level = Math.min(MAXIMUM_SEALS, Math.floor(totalCorrect / CORRECT_ANSWERS_PER_SEAL));
  const nextLevelAt = level >= MAXIMUM_SEALS ? null : (level + 1) * CORRECT_ANSWERS_PER_SEAL;

  if (level === 0) {
    return { level, totalCorrect, nextLevelAt, label: "Selo em Formação", shortLabel: "INÍCIO", description: `${totalCorrect} acerto(s) em simulados. Alcance ${CORRECT_ANSWERS_PER_SEAL} para conquistar o Selo 1.`, tone: sealTone(level) };
  }

  if (level === MAXIMUM_SEALS) {
    return { level, totalCorrect, nextLevelAt, label: "Selo 10", shortLabel: "SELO 10", description: `${totalCorrect} acerto(s) em simulados. Você conquistou todos os 10 selos.`, tone: sealTone(level) };
  }

  const remainingCorrectAnswers = (nextLevelAt ?? totalCorrect) - totalCorrect;
  return { level, totalCorrect, nextLevelAt, label: `Selo ${level}`, shortLabel: `SELO ${level}`, description: `${totalCorrect} acerto(s) em simulados. Faltam ${remainingCorrectAnswers} para o Selo ${level + 1}.`, tone: sealTone(level) };
}
