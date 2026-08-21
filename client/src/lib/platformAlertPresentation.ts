export const alertFallbackTitles = {
  improvement: "Melhoria",
  warning: "Aviso",
  urgent: "Urgência",
} as const;

export type AlertPresentationLevel = keyof typeof alertFallbackTitles;

export function resolvePlatformAlertTitle(title: string | null | undefined, level: AlertPresentationLevel) {
  const normalized = title?.trim();
  return normalized || alertFallbackTitles[level];
}
