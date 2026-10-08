import { Filter, Search, X } from "lucide-react";
import { marketplaceFilterOptions, type CourseMarketplaceFilters } from "@/lib/courseMarketplace";
import type { PublicStorefrontPlan } from "@/lib/publicStorefront";

type CourseFilterToolbarProps = {
  plans: PublicStorefrontPlan[];
  filters: CourseMarketplaceFilters;
  onChange: (next: CourseMarketplaceFilters) => void;
  compact?: boolean;
};

export function CourseFilterToolbar({ plans, filters, onChange, compact = false }: CourseFilterToolbarProps) {
  const options = marketplaceFilterOptions(plans);
  const hasFilters = Boolean(filters.search.trim() || filters.state || filters.area || filters.kind !== "all");
  const set = <K extends keyof CourseMarketplaceFilters>(key: K, value: CourseMarketplaceFilters[K]) =>
    onChange({ ...filters, [key]: value });
  const clear = () => onChange({ search: "", state: "", area: "", kind: "all" });
  const fieldClass = "mt-1.5 h-11 w-full min-w-0 rounded-xl border border-[#cfc7ba] bg-white px-3 text-base text-[#173d4a] focus-visible:border-[#0e5a70] sm:text-sm";

  return (
    <section aria-label="Filtros dos cursos" className={`min-w-0 rounded-2xl border border-[#c8dcd6] bg-[#edf7f5] ${compact ? "p-3 sm:p-4" : "p-4 sm:p-5"}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-[#173d4a]">
          <Filter className="h-4 w-4 text-[#0e5a70]" aria-hidden="true" />
          Encontre seu curso
        </h3>
        <button type="button" onClick={clear} disabled={!hasFilters} className="inline-flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-semibold text-[#0e5a70] hover:bg-white/75 disabled:cursor-not-allowed disabled:opacity-50">
          <X className="h-4 w-4" aria-hidden="true" /> Limpar filtros
        </button>
      </div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <label className="block min-w-0 text-sm font-semibold text-[#254751]">
          Buscar por nome ou tema
          <span className="relative block">
            <Search className="pointer-events-none absolute left-3 top-5 h-4 w-4 text-[#63807d]" aria-hidden="true" />
            <input type="search" value={filters.search} onChange={event => set("search", event.target.value)} placeholder="Ex.: Polícia Civil" className={`${fieldClass} pl-10`} />
          </span>
        </label>
        <label className="block min-w-0 text-sm font-semibold text-[#254751]">
          Estado
          <select value={filters.state} onChange={event => set("state", event.target.value)} className={fieldClass}>
            <option value="">Todos os estados</option>
            {options.states.map(state => <option key={state} value={state}>{state}</option>)}
          </select>
        </label>
        <label className="block min-w-0 text-sm font-semibold text-[#254751]">
          Área
          <select value={filters.area} onChange={event => set("area", event.target.value)} className={fieldClass}>
            <option value="">Todas as áreas</option>
            {options.areas.map(area => <option key={area} value={area}>{area}</option>)}
          </select>
        </label>
        <label className="block min-w-0 text-sm font-semibold text-[#254751]">
          Tipo de curso
          <select value={filters.kind} onChange={event => set("kind", event.target.value as CourseMarketplaceFilters["kind"])} className={fieldClass}>
            <option value="all">Concursos e tutoriais</option>
            <option value="concurso">Somente concursos</option>
            <option value="tutorial">Somente tutoriais</option>
          </select>
        </label>
      </div>
      {hasFilters && <p className="mt-3 text-xs font-medium text-[#315c62]">Os resultados abaixo refletem os filtros selecionados.</p>}
    </section>
  );
}
