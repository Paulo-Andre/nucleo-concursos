export function focusTimeLabel(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(Number.isFinite(seconds) ? seconds : 0));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}
export function focusRemainingSeconds(deadline: number, now = Date.now()) {
  return Math.max(0, Math.ceil((deadline - now) / 1000));
}
