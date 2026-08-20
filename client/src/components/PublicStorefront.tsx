import { ArrowRight, BookOpenCheck, Check, ChevronRight, Clock3, CreditCard, GraduationCap, Loader2, LockKeyhole, ShieldCheck, Sparkles } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { formatStorefrontCurrency, storefrontCourseLabel, storefrontPlanCta, storefrontPlanType, type PublicStorefrontPlan } from "@/lib/publicStorefront";

type PublicStorefrontProps = {
  onLogin: () => void;
  onChoosePlan: (planId: string) => void;
};

function scrollToPackages() {
  document.getElementById("pacotes")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function PublicStorefront({ onLogin, onChoosePlan }: PublicStorefrontProps) {
  const plans = trpc.commerce.plans.useQuery(undefined, { refetchOnWindowFocus: false });
  const catalog = (plans.data ?? []) as PublicStorefrontPlan[];

  return <main className="min-h-screen overflow-x-hidden bg-[#f6f1e7] text-[#173d4a]">
    <section className="relative isolate overflow-hidden bg-[#102f3a] text-[#fffdf7]">
      <div className="absolute inset-0 -z-10 opacity-70 [background-image:radial-gradient(circle_at_15%_15%,rgba(130,207,191,.22),transparent_26%),radial-gradient(circle_at_83%_72%,rgba(222,167,85,.18),transparent_22%),linear-gradient(115deg,transparent_0,rgba(255,255,255,.025)_48%,transparent_48.5%)]" />
      <div className="mx-auto max-w-7xl px-4 sm:px-7 lg:px-10">
        <header className="flex items-center justify-between gap-4 border-b border-white/15 py-4 sm:py-5">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex min-w-0 items-center gap-2.5 text-left" aria-label="Voltar ao início">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#e8e4d9] text-[#0e5a70]"><ShieldCheck className="h-5 w-5" /></span>
            <span className="min-w-0"><span className="font-display block truncate text-base font-extrabold tracking-tight sm:text-lg">NÚCLEO <span className="text-[#82cfbf]">CONCURSOS</span></span><span className="block text-[8px] font-bold tracking-[.17em] text-[#aac2c4] sm:text-[9px]">PREPARO MULTIDISCIPLINAR</span></span>
          </button>
          <button onClick={onLogin} className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-[#a5d8cd]/50 bg-white/5 px-3 py-2 text-xs font-bold text-white transition hover:bg-white/10 sm:px-4"><LockKeyhole className="h-4 w-4 text-[#9bdacd]" />Entrar</button>
        </header>

        <div className="grid gap-10 py-14 sm:py-20 lg:grid-cols-[1.08fr_.92fr] lg:items-center lg:py-24">
          <div className="max-w-3xl">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#86cfc0]/40 bg-[#1a4750] px-3 py-1.5 text-[10px] font-bold tracking-[.16em] text-[#a9e0d5]"><Sparkles className="h-3.5 w-3.5" />ESTUDE COM MÉTODO, EVOLUA COM REGISTRO</p>
            <h1 className="font-display mt-5 max-w-3xl text-[clamp(2.55rem,8vw,5.35rem)] font-extrabold leading-[.98] tracking-[-.045em]">O próximo passo da sua preparação começa aqui.</h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-[#c8dcda] sm:text-lg">Escolha uma trilha, organize o estudo por conteúdo e acompanhe o que já foi consolidado. O acesso é individual, seguro e liberado somente após a confirmação do pagamento.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row"><button onClick={scrollToPackages} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#8ad2c3] px-5 text-sm font-extrabold text-[#15353e] transition hover:bg-[#b4e8dd]">Ver pacotes disponíveis <ArrowRight className="h-4 w-4" /></button><button onClick={onLogin} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/25 px-5 text-sm font-bold text-white transition hover:bg-white/10">Já tenho uma conta <ChevronRight className="h-4 w-4" /></button></div>
          </div>
          <aside className="relative overflow-hidden rounded-2xl border border-white/15 bg-[#163f49] p-5 shadow-[0_24px_65px_rgba(0,0,0,.24)] sm:p-7">
            <div className="absolute right-0 top-0 h-32 w-32 rounded-full bg-[#8ad2c3]/10 blur-2xl" />
            <p className="text-[10px] font-bold tracking-[.18em] text-[#9cdbce]">UMA ROTINA EM TRÊS ETAPAS</p>
            <ol className="mt-6 space-y-5">{[
              ["01", "Escolha sua trilha", "Compare os pacotes ativos e selecione o que faz sentido para seu objetivo."],
              ["02", "Crie sua conta", "Seu histórico, seus simulados e sua evolução ficam ligados ao seu próprio acesso."],
              ["03", "Comece a estudar", "Após a confirmação do pagamento, as disciplinas da trilha ficam disponíveis."],
            ].map(([number, title, description]) => <li key={number} className="flex gap-4"><span className="font-display grid h-9 w-9 shrink-0 place-items-center rounded-full border border-[#84cbbb]/50 text-xs font-extrabold text-[#a9e0d5]">{number}</span><div><h2 className="font-display text-base font-bold text-white">{title}</h2><p className="mt-1 text-sm leading-5 text-[#b9cfce]">{description}</p></div></li>)}</ol>
          </aside>
        </div>
      </div>
    </section>

    <section className="border-y border-[#d7cfbf] bg-[#fffdf8]">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:grid-cols-3 sm:px-7 lg:px-10">{[
        [BookOpenCheck, "Conteúdo organizado", "Aulas e materiais distribuídos por trilha e disciplina."],
        [GraduationCap, "Evolução individual", "Progresso, revisões e simulados ficam registrados na sua conta."],
        [CreditCard, "Pagamento protegido", "O checkout acontece no ambiente seguro do Mercado Pago."],
      ].map(([Icon, title, text]) => <div key={title as string} className="flex gap-3 border-[#e5ddce] sm:border-r sm:pr-5 last:border-0"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#e9f3f0] text-[#0e5a70]"><Icon className="h-4 w-4" /></span><div><h2 className="text-sm font-extrabold text-[#173d4a]">{title as string}</h2><p className="mt-1 text-xs leading-5 text-[#56706e]">{text as string}</p></div></div>)}
      </div>
    </section>

    <section id="pacotes" className="scroll-mt-4 px-4 py-14 sm:px-7 sm:py-20 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl"><p className="eyebrow text-[#176a5a]">PACOTES PUBLICADOS PELO NÚCLEO</p><h2 className="font-display mt-3 text-[clamp(2rem,6vw,3.5rem)] font-extrabold leading-[1.02] tracking-[-.035em]">Escolha a sua próxima trilha.</h2><p className="mt-4 text-sm leading-6 text-[#52716f] sm:text-base">Os pacotes abaixo são atualizados diretamente pelo catálogo administrativo. Ao escolher um deles, você cria sua conta antes de seguir para o pagamento.</p></div>
        {plans.isLoading ? <div className="grid min-h-72 place-items-center"><div className="flex items-center gap-3 text-sm font-semibold text-[#52716f]"><Loader2 className="h-5 w-5 animate-spin text-[#0e5a70]" />Carregando pacotes ativos...</div></div> : !catalog.length ? <div className="mt-8 rounded-2xl border border-dashed border-[#b8cfc8] bg-[#fffdf8] p-8 text-sm leading-6 text-[#52716f]">Ainda não há pacotes publicados. Volte em breve para consultar novas trilhas.</div> : <div className="mt-9 grid gap-5 lg:grid-cols-2 xl:grid-cols-3">{catalog.map(plan => <article key={plan.id} className={`relative flex min-w-0 flex-col rounded-2xl border p-5 shadow-[0_12px_28px_rgba(22,61,74,.06)] ${plan.isHighlighted ? "border-[#0e5a70] bg-[#eef8f5]" : "border-[#d9d0c1] bg-[#fffdf8]"}`}>
          {plan.isHighlighted && <span className="absolute -top-3 left-5 rounded-full bg-[#0e5a70] px-3 py-1 text-[10px] font-bold tracking-[.12em] text-white">OFERTA EM DESTAQUE</span>}
          <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="text-[10px] font-bold tracking-[.15em] text-[#4b7776]">{storefrontPlanType(plan.planType).toUpperCase()}</p><h3 className="font-display mt-2 break-words text-2xl font-extrabold leading-tight text-[#173d4a]">{plan.title}</h3></div><p className="shrink-0 text-right font-display text-2xl font-extrabold text-[#0e5a70]">{formatStorefrontCurrency(plan.priceCents)}</p></div>
          <p className="mt-4 min-h-12 text-sm leading-6 text-[#52716f]">{plan.description || "Acesso organizado às trilhas incluídas neste pacote."}</p>
          <div className="mt-5 rounded-xl border border-[#dbe9e4] bg-white/80 p-3.5"><p className="text-[10px] font-bold tracking-[.14em] text-[#52716f]">TRILHAS INCLUÍDAS</p><ul className="mt-2.5 space-y-2">{plan.courseIds.map(courseId => <li key={courseId} className="flex gap-2 text-sm font-medium text-[#315a5d]"><Check className="mt-0.5 h-4 w-4 shrink-0 text-[#17644e]" /><span className="break-words">{storefrontCourseLabel(courseId)}</span></li>)}</ul></div>
          <div className="mt-5 flex items-center gap-2 text-xs font-bold text-[#52716f]"><Clock3 className="h-4 w-4 text-[#0e5a70]" />{plan.accessDurationDays} dia{plan.accessDurationDays === 1 ? "" : "s"} de acesso</div>
          <button onClick={() => onChoosePlan(plan.id)} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0e5a70] px-4 text-sm font-extrabold text-white transition hover:bg-[#09495b]">{storefrontPlanCta(plan.priceCents)} <ArrowRight className="h-4 w-4" /></button>
          <p className="mt-3 text-center text-[11px] leading-4 text-[#6a817e]">Primeiro você cria a conta. O pagamento acontece depois, em ambiente seguro.</p>
        </article>)}</div>}
      </div>
    </section>

    <section className="px-4 pb-14 sm:px-7 sm:pb-20 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col gap-6 rounded-2xl bg-[#dceee8] p-6 sm:p-9 lg:flex-row lg:items-center lg:justify-between"><div className="max-w-2xl"><p className="eyebrow text-[#176a5a]">PRONTO PARA COMEÇAR?</p><h2 className="font-display mt-2 text-2xl font-extrabold text-[#173d4a] sm:text-3xl">Sua preparação pode ter um ponto de partida claro.</h2><p className="mt-3 text-sm leading-6 text-[#456965]">Conheça os pacotes ativos, escolha uma trilha e registre seu acesso para começar.</p></div><button onClick={scrollToPackages} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-xl bg-[#173d4a] px-5 text-sm font-extrabold text-white transition hover:bg-[#0e5a70]">Conhecer pacotes <ArrowRight className="h-4 w-4" /></button></div></section>

    <footer className="border-t border-[#d9d0c1] bg-[#fffdf8] px-4 py-7 sm:px-7 lg:px-10"><div className="mx-auto flex max-w-7xl flex-col gap-2 text-xs text-[#597370] sm:flex-row sm:items-center sm:justify-between"><p className="font-bold text-[#315a5d]">NÚCLEO CONCURSOS</p><p>Acesso individual · Pagamento processado pelo Mercado Pago.</p></div></footer>
  </main>;
}
