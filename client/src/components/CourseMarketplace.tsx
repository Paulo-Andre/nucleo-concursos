import { useMemo, useState } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, BookOpenCheck, Loader2, MapPin, Sparkles, Tag } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { filterMarketplacePlans, type CourseMarketplaceFilters } from "@/lib/courseMarketplace";
import { formatStorefrontCurrency, storefrontPlanCta, type PublicStorefrontPlan } from "@/lib/publicStorefront";
import { PlanCoverCarousel } from "@/components/PlanCoverCarousel";
import { CourseFilterToolbar } from "@/components/CourseFilterToolbar";

export function CourseMarketplace({ onChoosePlan, onBack }: { onChoosePlan: (planId: string) => void; onBack: () => void }) {
  const plansQuery = trpc.commerce.plans.useQuery(undefined, { refetchOnWindowFocus: false });
  const [filters, setFilters] = useState<CourseMarketplaceFilters>({ search: "", state: "", area: "", kind: "all" });
  const plans = (plansQuery.data ?? []) as PublicStorefrontPlan[];
  const visiblePlans = useMemo(() => filterMarketplacePlans(plans, filters), [plans, filters]);
  const hasFilters = Boolean(filters.search.trim() || filters.state || filters.area || filters.kind !== "all");

  return (
    <main className="min-h-screen bg-[#f6f1e7] text-[#173d4a]">
      <header className="border-b border-[#d9d0c1] bg-[#fffdf8]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 sm:px-7 lg:px-10">
          <button type="button" onClick={onBack} className="ghost-button min-h-11">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Página inicial
          </button>
          <p className="font-display text-base font-extrabold sm:text-lg">Núcleo Concursos</p>
        </div>
      </header>
      <section className="border-b border-[#244550] bg-[#15323e] text-[#fffdf7]">
        <div className="mx-auto max-w-7xl px-4 py-10 sm:px-7 sm:py-14 lg:px-10">
          <p className="inline-flex items-center gap-2 text-xs font-bold tracking-wide text-[#9be0d2]">
            <Sparkles className="h-4 w-4" aria-hidden="true" /> CATÁLOGO DE CURSOS
          </p>
          <h1 className="font-display mt-4 max-w-3xl text-3xl font-extrabold leading-tight tracking-tight sm:text-5xl">Encontre o curso certo para você.</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#d7e9e5]">Busque pelo nome, estado ou área. Veja o que cada pacote inclui antes de iniciar a compra.</p>
        </div>
      </section>
      <section aria-label="Catálogo de cursos" className="mx-auto max-w-7xl px-4 py-7 sm:px-7 lg:px-10">
        <CourseFilterToolbar plans={plans} filters={filters} onChange={setFilters} />
        {plansQuery.isLoading ? (
          <div className="mt-6 flex min-h-48 items-center justify-center gap-3 rounded-2xl border border-[#d4dfdb] bg-[#fffdf8] p-6 text-sm font-semibold text-[#52716f]" role="status">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> Carregando cursos publicados...
          </div>
        ) : plansQuery.isError ? (
          <div role="alert" className="mt-6 rounded-2xl border border-[#d7a8a0] bg-[#fff5f2] p-6 text-center">
            <AlertCircle className="mx-auto h-7 w-7 text-[#953e38]" aria-hidden="true" />
            <h2 className="font-display mt-3 text-xl font-bold text-[#63332e]">Não conseguimos carregar os cursos.</h2>
            <p className="mt-2 text-sm text-[#77534e]">Verifique a conexão e tente novamente.</p>
            <button type="button" onClick={() => void plansQuery.refetch()} className="ghost-button mt-4 min-h-11">Tentar novamente</button>
          </div>
        ) : (
          <>
            <p className="mt-6 text-sm font-semibold text-[#52716f]" role="status" aria-live="polite">
              {visiblePlans.length} pacote{visiblePlans.length === 1 ? " encontrado" : "s encontrados"}
            </p>
            {visiblePlans.length ? (
              <div className="mt-4 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {visiblePlans.map(plan => (
                  <article key={plan.id} className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[#d4dfdb] bg-[#fffdf8] p-5 shadow-[0_12px_28px_rgba(22,61,74,.06)]">
                    <PlanCoverCarousel images={plan.coverImageUrls} planTitle={plan.title} />
                    <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-[#52716f]">{plan.planType === "subscription" ? "Assinatura" : "Pacote de curso"}</p>
                        <h2 className="font-display mt-1 break-words text-xl font-extrabold">{plan.title}</h2>
                      </div>
                      <p className="font-display text-xl font-extrabold text-[#0e5a70]">{formatStorefrontCurrency(plan.priceCents)}</p>
                    </div>
                    {plan.description && <p className="mt-3 text-sm leading-6 text-[#52716f]">{plan.description}</p>}
                    <div className="mt-4 space-y-2 border-t border-[#e2dbd0] pt-4">
                      {(plan.courses ?? []).map(course => (
                        <div key={course.id} className="rounded-xl border border-[#d7e5e0] bg-white p-3">
                          <div className="flex items-start gap-2">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-[#e9f3f0] text-[#0e5a70]"><BookOpenCheck className="h-4 w-4" aria-hidden="true" /></span>
                            <div className="min-w-0">
                              <p className="text-sm font-bold">{course.title}</p>
                              <p className="mt-1 flex flex-wrap gap-x-2 gap-y-1 text-xs font-medium text-[#52716f]">
                                {(course.courseArea || course.track) && <span className="inline-flex items-center gap-1"><Tag className="h-3 w-3" aria-hidden="true" />{course.courseArea || course.track}</span>}
                                <span className="inline-flex items-center gap-1"><MapPin className="h-3 w-3" aria-hidden="true" />{course.stateCode || "Nacional"}</span>
                                <span>{course.courseType === "tutorial" ? "Tutorial" : "Concurso"}</span>
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button type="button" onClick={() => onChoosePlan(plan.id)} className="action-button mt-auto min-h-12 w-full pt-3">
                      {storefrontPlanCta(plan.priceCents)} <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[#c9c0b3] bg-[#fffdf8] p-8 text-center">
                <h2 className="font-display text-xl font-bold">{hasFilters ? "Nenhum curso encontrado com esses filtros" : "Nenhum curso publicado no momento"}</h2>
                <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#52716f]">
                  {hasFilters ? "Tente outro nome, estado ou área para ampliar a busca." : "Volte mais tarde para consultar os cursos disponíveis."}
                </p>
                {hasFilters && <button type="button" onClick={() => setFilters({ search: "", state: "", area: "", kind: "all" })} className="ghost-button mt-4 min-h-11">Limpar filtros</button>}
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
