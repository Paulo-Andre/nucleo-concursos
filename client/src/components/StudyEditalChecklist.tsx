import { useMemo } from "react";
import { CheckCircle2, Circle, ClipboardList, Clock3, ChevronRight } from "lucide-react";
import { buildEdictChecklist, type EdictChecklistContent } from "@/lib/editalChecklist";

export function StudyEditalChecklist({ contents, onOpen }: {
  contents: EdictChecklistContent[];
  onOpen: (id: number) => void;
}) {
  const groups = useMemo(() => buildEdictChecklist(contents), [contents]);
  const finished = groups.reduce((sum, group) => sum + group.completed, 0);
  const total = groups.reduce((sum, group) => sum + group.total, 0);

  return <section className="shell-card p-5 sm:p-6" aria-label="Checklist de conteúdos do curso">
    <p className="eyebrow flex items-center gap-2"><ClipboardList aria-hidden="true" className="h-4 w-4" />COBERTURA DA BIBLIOTECA</p>
    <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
      <div><h3 className="font-display text-xl font-bold">Checklist do seu curso</h3>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52666f]">Veja o que concluiu e o que falta estudar em cada disciplina, com acesso direto à aula.</p></div>
      <span role="status" className="rounded-xl bg-[#e5f2ed] px-3 py-2 text-sm font-bold text-[#17644e]">{finished}/{total} aulas concluídas</span>
    </div>
    <p className="mt-3 text-xs leading-5 text-[#536d72]">A cobertura considera somente as aulas publicadas e vinculadas ao seu curso. Ela não substitui a conferência dos tópicos do edital oficial.</p>
    {!groups.length ? <p className="mt-5 rounded-xl border border-dashed border-[#c8d6d1] p-4 text-sm text-[#52666f]">Não existem conteúdos publicados para este curso.</p> :
      <div className="mt-5 space-y-3">{groups.map(group => <details key={group.name} className="rounded-xl border border-[#c8ded7] bg-white p-4">
        <summary className="cursor-pointer select-none rounded-lg focus-visible:outline-2 focus-visible:outline-[#0e5a70]">
          <span className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-[#173d4a]">{group.name}</span>
            <span className="text-sm font-semibold tabular-nums text-[#0e5a70]">{group.completed} de {group.total} · {group.percent}%</span>
          </span>
          <span aria-hidden="true" className="mt-3 block h-2 overflow-hidden rounded-full bg-[#e6efeb]">
            <span className="block h-full rounded-full bg-[#0e5a70]" style={{width: `${group.percent}%`}}/>
          </span>
          <span className="mt-2 block text-xs text-[#536d72]">{group.notStarted} não iniciada(s) · {group.started} em andamento · {group.completed} concluída(s)</span>
        </summary>
        <ul className="mt-4 space-y-2 border-t border-[#e2eae5] pt-3">{group.contents.map(item => <li key={item.id}>
          <button type="button" onClick={() => onOpen(item.id)} className="flex min-h-11 w-full items-center gap-3 rounded-lg px-2 py-2 text-left text-sm transition hover:bg-[#edf7f4] focus-visible:outline-2 focus-visible:outline-[#0e5a70]">
            {item.status === "completed" ? <CheckCircle2 aria-hidden="true" className="h-5 w-5 shrink-0 text-[#17644e]"/> : item.status === "started" ? <Clock3 aria-hidden="true" className="h-5 w-5 shrink-0 text-[#94651d]"/> : <Circle aria-hidden="true" className="h-5 w-5 shrink-0 text-[#70878b]"/>}
            <span className="min-w-0 flex-1 break-words font-medium text-[#173d4a]">{item.title}</span>
            <span className="sr-only">{item.status === "completed" ? "Concluída" : item.status === "started" ? "Em andamento" : "Não iniciada"}</span>
            <ChevronRight aria-hidden="true" className="h-4 w-4 shrink-0 text-[#0e5a70]"/>
          </button>
        </li>)}</ul>
      </details>)}</div>}
  </section>;
}
