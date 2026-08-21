import { AlertTriangle, CheckCircle2, X, XCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";

const appearance = {
  improvement: { title: "Melhoria", icon: CheckCircle2, className: "border-[#78bfa5] bg-[#ecf8f1] text-[#145f48]" },
  warning: { title: "Aviso", icon: AlertTriangle, className: "border-[#e0a34a] bg-[#fff6df] text-[#825107]" },
  urgent: { title: "Urgência", icon: XCircle, className: "border-[#dc7772] bg-[#fff0ef] text-[#942d29]" },
} as const;

export function StudentAlerts() {
  const utils = trpc.useUtils();
  const alertsQuery = trpc.platform.alerts.useQuery(undefined, { refetchOnWindowFocus: false });
  const dismiss = trpc.platform.dismissAlert.useMutation({ onSuccess: () => void utils.platform.alerts.invalidate() });
  if (!alertsQuery.data?.length) return null;
  return <section aria-label="Alertas da plataforma" className="mb-5 space-y-3">{alertsQuery.data.map(alert => { const style = appearance[alert.level as keyof typeof appearance]; const Icon = style.icon; return <div key={alert.id} role="alert" className={`flex items-start gap-3 rounded-2xl border px-4 py-3 shadow-sm ${style.className}`}><Icon className="mt-0.5 h-5 w-5 shrink-0" /><div className="min-w-0 flex-1"><p className="text-xs font-extrabold uppercase tracking-[0.14em]">{style.title}</p><p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-6">{alert.message}</p></div><button type="button" aria-label={`Fechar alerta de ${style.title}`} disabled={dismiss.isPending} onClick={() => dismiss.mutate({ alertId: alert.id })} className="grid h-8 w-8 shrink-0 place-items-center rounded-lg border border-current/25 transition hover:bg-white/45 disabled:opacity-50"><X className="h-4 w-4" /></button></div>; })}</section>;
}
