import { Mail, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";

type GlobalContactLinksProps = {
  variant?: "footer" | "sidebar";
};

export function GlobalContactLinks({ variant = "footer" }: GlobalContactLinksProps) {
  const contactsQuery = trpc.platform.contacts.useQuery(undefined, { refetchOnWindowFocus: false });
  const contacts = contactsQuery.data;
  const hasEmail = Boolean(contacts?.email);
  const hasTelegram = Boolean(contacts?.telegramUrl);

  if (contactsQuery.isLoading || (!hasEmail && !hasTelegram)) return null;

  if (variant === "sidebar") {
    return (
      <div className="mt-5 border-t border-white/10 pt-4">
        <p className="px-2 text-[9px] font-bold tracking-[0.16em] text-[#7e99a1]">SUPORTE DO NÚCLEO</p>
        <div className="mt-2 space-y-1">
          {hasEmail && <a href={`mailto:${contacts?.email}`} className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-[#c6d7dc] transition hover:bg-white/10 hover:text-white"><Mail className="h-3.5 w-3.5 text-[#9be0d2]" /><span className="truncate">{contacts?.email}</span></a>}
          {hasTelegram && <a href={contacts?.telegramUrl ?? "#"} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-[#c6d7dc] transition hover:bg-white/10 hover:text-white"><Send className="h-3.5 w-3.5 text-[#9be0d2]" /><span>Telegram do Núcleo</span></a>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-[#597370]">
      <span className="font-bold text-[#315a5d]">Fale conosco</span>
      {hasEmail && <a href={`mailto:${contacts?.email}`} className="inline-flex items-center gap-1.5 font-semibold text-[#0e5a70] hover:underline"><Mail className="h-3.5 w-3.5" />{contacts?.email}</a>}
      {hasTelegram && <a href={contacts?.telegramUrl ?? "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-[#0e5a70] hover:underline"><Send className="h-3.5 w-3.5" />Telegram</a>}
    </div>
  );
}
