/** Dia civil de Brasília, independente do fuso do servidor ou navegador. */
export function brazilStudyDayKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(date);
  const value = (field: string) => parts.find(part => part.type === field)?.value ?? "";
  return `${value("year")}-${value("month")}-${value("day")}`;
}

export function brazilPreviousDay(date = new Date()) {
  return new Date(date.getTime() - 24 * 60 * 60 * 1000);
}
