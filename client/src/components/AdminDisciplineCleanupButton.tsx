import { useState } from "react";
import { AlertTriangle, Eraser, ShieldAlert, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

/** Exclusão em lote com prévia transacional: nenhum dado é alterado na conferência. */
export function AdminDisciplineCleanupButton({ discipline, onCompleted }: {
  discipline: { id: number; name: string; shortName: string };
  onCompleted: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"unlink" | "delete_exclusive">("unlink");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const preview = trpc.admin.disciplines.contentCleanupPreview.useMutation();
  const confirm = trpc.admin.disciplines.contentCleanupConfirm.useMutation();

  const show = async () => {
    setMessage("");setConfirmation("");setMode("unlink");
    try {
      await preview.mutateAsync({id:discipline.id});
      setOpen(true);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível analisar os vínculos.");
    }
  };
  const run = async () => {
    const plan = preview.data;
    if (!plan || !plan.canExecute || confirmation !== `LIMPAR ${discipline.shortName}`) return;
    try {
      const result = await confirm.mutateAsync({
        disciplineId:discipline.id,mode,confirmation,previewToken:plan.previewToken,
      });
      setMessage(`${result.removedLinks} vínculos retirados; ${result.deletedContents} conteúdos exclusivos excluídos. Os conteúdos compartilhados e todas as questões foram preservados.`);
      setOpen(false);
      await onCompleted();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "A limpeza não foi realizada.");
    }
  };
  const plan=preview.data;
  const busy=preview.isPending||confirm.isPending;
  return <>
    <button type="button" disabled={busy} onClick={()=>void show()} className="inline-flex items-center gap-1 text-[10px] font-bold text-[#92501f] hover:underline disabled:opacity-50">
      <Eraser className="h-3.5 w-3.5"/>Limpar todos os conteúdos
    </button>
    {message&&!open&&<p role="status" className="mt-2 rounded-lg border border-[#e1c6a5] bg-[#fff7e7] p-2 text-[10px] leading-4 text-[#7e4b20]">{message}</p>}
    {open&&plan&&<div role="presentation" className="fixed inset-0 z-[96] flex items-center justify-center bg-[#152d38]/70 p-3">
      <section role="dialog" aria-modal="true" aria-labelledby={`cleanup-title-${discipline.id}`} className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-xl border border-[#e3c4b5] bg-white p-5 shadow-xl">
        <h3 id={`cleanup-title-${discipline.id}`} className="flex items-center gap-2 text-lg font-bold text-[#9b3d33]"><ShieldAlert className="h-5 w-5"/>Limpar a disciplina</h3>
        <p className="mt-2 text-sm font-semibold text-[#183f48]">{plan.disciplineName} ({plan.shortName})</p>
        <div className="mt-3 rounded-lg border border-[#e3e8e4] bg-[#f6faf8] p-3 text-xs leading-6 text-[#45636a]">
          <p><b>{plan.total}</b> conteúdos vinculados</p>
          <p><b>{plan.exclusive}</b> exclusivos desta disciplina</p>
          <p><b>{plan.shared}</b> também utilizados por outras disciplinas</p>
          <p><b>{plan.linkedQuestions}</b> vínculos com questões (questões não serão apagadas)</p>
          <p><b>{plan.studentProgress}</b> registros de progresso e <b>{plan.studentRoadmaps}</b> roteiros de alunos</p>
        </div>
        {!plan.canExecute?
          <p role="alert" className="mt-3 flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 p-3 text-xs font-semibold text-red-800">
            <AlertTriangle className="h-4 w-4 shrink-0"/>A limpeza está bloqueada: {plan.protectedCount ? "existem conteúdos utilizados em progresso ou roteiros de alunos. Altere a disciplina para INATIVA ou reorganize os vínculos antes de excluir." : "não há conteúdos para limpar."}
          </p>:
          <>
            <fieldset className="mt-4 space-y-3 text-xs">
              <legend className="font-bold text-[#183f48]">Selecione a operação</legend>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#b9d6cc] bg-[#f3faf7] p-3">
                <input type="radio" checked={mode==="unlink"} onChange={()=>setMode("unlink")} className="mt-0.5"/>
                <span><b>Somente desvincular todos</b><span className="mt-1 block text-[#53666d]">Retira as aulas desta disciplina sem excluir nenhuma aula ou questão do banco. Recomendado para reorganizar o curso.</span></span>
              </label>
              <label className="flex cursor-pointer items-start gap-2 rounded-lg border border-[#e4b5a6] bg-[#fff5f1] p-3">
                <input type="radio" checked={mode==="delete_exclusive"} onChange={()=>setMode("delete_exclusive")} className="mt-0.5"/>
                <span><b>Excluir definitivamente conteúdos exclusivos</b><span className="mt-1 block text-[#765450]">Apaga {plan.exclusive} aulas exclusivas e desvincula {plan.shared} compartilhadas, preservando todas as questões e os conteúdos de outras disciplinas. Não pode ser desfeito.</span></span>
              </label>
            </fieldset>
            <label className="mt-4 block text-xs font-bold text-[#183f48]">Digite <strong className="text-[#9b3d33]">LIMPAR {discipline.shortName}</strong> para confirmar
              <input type="text" value={confirmation} onChange={e=>setConfirmation(e.target.value)} className="mt-2 h-10 w-full rounded border border-[#c1d0ca] bg-white px-3 text-sm" placeholder="Confirmação obrigatória"/>
            </label>
          </>
        }
        {message&&<p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-xs text-red-800">{message}</p>}
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <button disabled={busy} onClick={()=>{setOpen(false);setMessage("");}} className="rounded border border-[#b9cdc8] bg-white px-4 py-2 text-xs font-bold text-[#36545b]">Cancelar</button>
          {plan.canExecute&&<button disabled={busy||confirmation!==`LIMPAR ${discipline.shortName}`} onClick={()=>void run()} className="inline-flex items-center gap-2 rounded bg-[#9b3d33] px-4 py-2 text-xs font-bold text-white disabled:opacity-40">
            <Trash2 className="h-4 w-4"/>{busy?"Executando…":mode==="unlink"?"Retirar todos os vínculos":"Excluir conteúdos exclusivos"}
          </button>}
        </div>
      </section>
    </div>}
  </>;
}
