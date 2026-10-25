import { BookOpenCheck, Loader2, Search, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { KnowledgeBaseManager } from "@/components/KnowledgeBaseManager";
import { existingQuestionEditingSteps, rootAdminAreas } from "@/lib/rootAdminNavigation";

export function AdminLibraryPanel({ onClose, embedded = false }: { onClose?: () => void; embedded?: boolean }) {
  const coursesQuery = trpc.admin.courses.useQuery();

  return <div className={embedded ? "h-full min-h-0 overflow-y-auto bg-[#fffdf8]" : "fixed inset-0 z-[70] bg-[#152d38]/65 p-3 backdrop-blur-sm"}>
    <section role={embedded ? undefined : "dialog"} aria-modal={embedded ? undefined : true} aria-labelledby="biblioteca-titulo" className={embedded ? "flex h-full w-full flex-col overflow-hidden bg-[#fffdf8]" : "mx-auto flex h-[calc(100vh-1.5rem)] w-full max-w-7xl flex-col overflow-hidden rounded-[1.35rem] border border-[#274a54] bg-[#fffdf8] shadow-2xl"}>
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-[#d8d0c4] bg-[#183542] p-4 text-white sm:p-5">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-wide text-[#99d8ca]">ADMINISTRAÇÃO · ENSINO</p>
          <h2 id="biblioteca-titulo" className="font-display mt-1 text-xl font-bold">{rootAdminAreas.library.title}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-[#d3e6e1]">Pesquise questões existentes, edite os dados e registre suas alterações. A gestão da biblioteca é independente da gestão de alunos.</p>
        </div>
        {!embedded && <button type="button" onClick={onClose} aria-label="Fechar biblioteca" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/25 text-white"><X className="h-5 w-5" aria-hidden="true" /></button>}
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
        <section aria-label="Como editar uma questão" className="mb-5 grid gap-3 rounded-xl border border-[#c8dcd6] bg-[#edf7f4] p-4 md:grid-cols-3">
          <div className="flex gap-3"><Search className="mt-0.5 h-5 w-5 shrink-0 text-[#0e5a70]" aria-hidden="true" /><p className="text-sm leading-6 text-[#365e61]"><strong>1. Encontre.</strong> {existingQuestionEditingSteps[0]}</p></div>
          <div className="flex gap-3"><BookOpenCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0e5a70]" aria-hidden="true" /><p className="text-sm leading-6 text-[#365e61]"><strong>2. Edite.</strong> {existingQuestionEditingSteps[1]}</p></div>
          <p className="text-sm leading-6 text-[#365e61]"><strong>3. Salve.</strong> {existingQuestionEditingSteps[2]}</p>
        </section>
        {coursesQuery.isLoading ? <div role="status" className="flex min-h-40 items-center justify-center gap-3 text-sm text-[#52716f]"><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />Carregando a biblioteca...</div> : coursesQuery.isError ? <div role="alert" className="rounded-xl border border-[#d7a8a0] bg-[#fff5f2] p-6 text-sm text-[#953e38]">Não foi possível carregar os cursos vinculados à biblioteca. <button type="button" onClick={() => void coursesQuery.refetch()} className="ml-2 min-h-11 font-bold underline">Tentar novamente</button></div> : <KnowledgeBaseManager courses={coursesQuery.data ?? []} />}
      </div>
    </section>
  </div>;
}
