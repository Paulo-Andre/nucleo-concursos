import { useState } from "react";
import { FileSpreadsheet, ShieldCheck, AlertTriangle, Upload } from "lucide-react";
import { trpc } from "@/lib/trpc";

type Kind="contents"|"questions";
const templates:Record<Kind,string[]> = {
 contents:["titulo","objetivo","descricao","resumo_card","corpo","disciplina_ids","disciplinas","status","exigir_revisao","aviso","capa_url","video_url","video_rotulo","material_url","material_rotulo"],
 questions:["enunciado","texto_base","tipo","alternativa_a","alternativa_b","alternativa_c","alternativa_d","alternativa_e","resposta","comentario","dificuldade","banca","ano","fonte","conteudo_ids","conteudos","status","exigir_revisao"],
};
export function AdminSpreadsheetImportPanel({onImported}:{onImported:()=>Promise<void>}) {
 const [kind,setKind]=useState<Kind>("contents");
 const [mode,setMode]=useState<"create"|"upsert">("create");
 const [questionDuplicateMode,setQuestionDuplicateMode]=useState<"reject"|"link">("reject");
 const [fallbackDisciplineId,setFallbackDisciplineId]=useState<number | undefined>(undefined);
 const disciplineQuery=trpc.admin.disciplines.list.useQuery();
 const [file,setFile]=useState<{fileName:string;base64:string}|null>(null);
 const [error,setError]=useState("");
 const [confirmed,setConfirmed]=useState(false);
 const preview=trpc.admin.spreadsheets.preview.useMutation();
 const confirm=trpc.admin.spreadsheets.confirm.useMutation({onSuccess:async data=>{
  if(data.created>0||data.updated>0||data.linked>0){setConfirmed(true);await onImported();}
 }});
 const clear=()=>{setFile(null);setError("");setConfirmed(false);preview.reset();confirm.reset();};
 const choose=async(selected:File|undefined)=>{
  clear();if(!selected)return;
  if(selected.size>3*1024*1024){setError("Arquivo com mais de 3 MB. Divida a importação em lotes.");return;}
  if(!/\.(xlsx|csv)$/i.test(selected.name)){setError("Escolha um arquivo .xlsx ou .csv.");return;}
  const reader=new FileReader();
  try{
   const base64=await new Promise<string>((resolve,reject)=>{
    reader.onload=()=>resolve(String(reader.result||"").split(",")[1]||"");
    reader.onerror=()=>reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(selected);
   });
   setFile({fileName:selected.name,base64});
  }catch(e){setError(e instanceof Error?e.message:"Falha ao ler arquivo.");}
 };
 const template=()=>{
  const csv=templates[kind].join(";")+"\r\n";
  const blob=new Blob(["\uFEFF",csv],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const element=document.createElement("a");
  element.href=url;element.download=`modelo_${kind}_nucleo.csv`;element.click();
  URL.revokeObjectURL(url);
 };
 const result=preview.data;
 return <section className="mt-5 space-y-5">
  <div className="rounded-2xl border border-[#b9d8cf] bg-white p-5"><p className="eyebrow flex items-center gap-2"><FileSpreadsheet className="h-4 w-4"/>IMPORTAÇÃO EM LOTE</p><h4 className="font-display mt-2 text-xl font-bold">Importar conteúdos e questões do Excel</h4><p className="mt-2 text-sm leading-6 text-[#52666f]">Compatível com os modelos CONTEUDOS e QUESTOES. Aceita XLSX e CSV de até 3 MB e 1.000 registros por arquivo. Primeiro valida todas as linhas; uma falha cancela a importação inteira no banco.</p>
   <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold">O que importar<select className="filter-control mt-1.5" value={kind} onChange={event=>{setKind(event.target.value as Kind);setMode("create");setQuestionDuplicateMode("reject");setFallbackDisciplineId(undefined);clear();}}><option value="contents">Conteúdos / aulas</option><option value="questions">Questões</option></select></label><label className="block text-sm font-semibold">Planilha .xlsx ou .csv<input className="mt-1.5 block w-full rounded-xl border border-[#b6d2ca] bg-white p-2 text-sm" type="file" accept=".xlsx,.csv" onChange={event=>void choose(event.target.files?.[0])}/></label></div>
   {kind==="contents"&&<div className="mt-3 rounded-xl border border-[#c1d9d0] bg-[#f4faf7] p-3">
    <label className="block text-sm font-semibold">O que fazer com aulas que já existem?
     <select className="filter-control mt-1.5 w-full" value={mode} onChange={event=>{setMode(event.target.value as "create"|"upsert");setConfirmed(false);preview.reset();confirm.reset();}}>
      <option value="create">Somente criar aulas novas (bloquear títulos existentes)</option>
      <option value="upsert">Atualizar aulas existentes pelo título e criar aulas ausentes</option>
     </select>
    </label>
    {mode==="upsert"&&<p className="mt-2 text-xs leading-5 text-[#52666f]">Mantém o ID, o progresso e os vínculos das questões existentes. Preserva PDFs, vídeos e capas já cadastrados quando os campos de URL estiverem vazios. As disciplinas informadas na planilha substituem os vínculos anteriores da aula. Confira antes se Língua Portuguesa está vinculada ao curso.</p>}
   </div>}
   {kind==="questions"&&<div className="mt-3 rounded-xl border border-[#c1d9d0] bg-[#f4faf7] p-3">
    <label className="block text-sm font-semibold">Disciplina para questões sem conteúdo/aula
     <select className="filter-control mt-1.5 w-full" value={fallbackDisciplineId??""} onChange={event=>{setFallbackDisciplineId(event.target.value?Number(event.target.value):undefined);setConfirmed(false);preview.reset();confirm.reset();}}>
      <option value="">Não usar associação automática</option>
      {(disciplineQuery.data??[]).map(d=><option key={d.id} value={d.id}>{d.name}</option>)}
     </select>
    </label>
    <p className="mt-2 text-xs leading-5 text-[#52666f]">Quando a planilha não indicar uma aula existente, as questões serão agrupadas em “Questões avulsas — [Disciplina]”. Conteúdos identificados por ID ou título permanecem vinculados normalmente. Escolha a disciplina correta antes de validar.</p>
    <label className="mt-3 block text-sm font-semibold">Questões com enunciado já existente no banco
      <select className="filter-control mt-1.5 w-full" value={questionDuplicateMode}
        onChange={event=>{setQuestionDuplicateMode(event.target.value as "reject"|"link");setConfirmed(false);preview.reset();confirm.reset();}}>
        <option value="reject">Bloquear duplicados (padrão)</option>
        <option value="link">Reutilizar existentes e criar somente vínculos ausentes</option>
      </select>
    </label>
    {questionDuplicateMode==="link"&&<p className="mt-2 text-xs leading-5 text-[#516d70]">
      Reutiliza o mesmo ID e preserva gabarito, enunciado, publicação e histórico. Somente aceita correspondência exata de
      texto-base, tipo, alternativas e resposta. Se houver diferenças ou múltiplos registros iguais, a importação será bloqueada.
      Uma questão compartilhada continuará visível nos outros conteúdos aos quais já está vinculada.
    </p>}
   </div>}
   <div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={template} className="ghost-button min-h-11">Baixar modelo CSV</button><button type="button" disabled={!file||preview.isPending||confirmed} onClick={()=>{if(file)preview.mutate({kind,...file,mode:kind==="contents"?mode:"create",fallbackDisciplineId:kind==="questions"?fallbackDisciplineId:undefined,questionDuplicateMode:kind==="questions"?questionDuplicateMode:"reject"});}} className="action-button min-h-11 disabled:opacity-50"><Upload className="mr-2 inline h-4 w-4"/>Validar e visualizar</button></div>
   <p className="mt-3 text-xs leading-5 text-[#52666f]">Use `disciplina_ids` ou `disciplinas` (sigla/nome), e `conteudo_ids` ou `conteudos` (título exato). Questões sem aula podem usar a disciplina selecionada acima. Cada item precisa de vínculo para ser encontrado pelo aluno. Arquivos .xls antigos devem ser salvos como .xlsx.</p>
  </div>
  {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  {(preview.isError||confirm.isError)&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{preview.error?.message||confirm.error?.message}</p>}
  {result&&<div className="rounded-2xl border border-[#c6ded6] bg-[#fffdf8] p-5">
   <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#17644e]"/><h5 className="text-lg font-bold">Prévia da importação</h5></div>
   <p className="mt-3 text-sm">{result.count} linha(s) válida(s) · {result.errors.length} erro(s). <b>{result.toCreate} nova(s)</b>, <b>{result.toUpdate} atualização(ões)</b> e <b>{result.toLink} questão(ões) já existentes para vincular</b>. Nenhum dado é alterado nesta etapa.</p>
   {result.errors.length>0&&<div role="alert" className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-4"><p className="font-semibold text-[#895a22]"><AlertTriangle className="mr-1 inline h-4 w-4"/>Corrija os erros antes de importar</p><ul className="mt-2 max-h-60 list-inside list-disc space-y-1 overflow-y-auto text-sm text-[#895a22]">{result.errors.map((e,i)=><li key={i}>{e}</li>)}</ul></div>}
   {result.preview.length>0&&<div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-[#dfebe6]"><table className="w-full table-auto text-left text-sm"><thead className="sticky top-0 bg-[#e5f2ed]"><tr><th className="p-2">Linha</th><th className="p-2">Título ou enunciado</th><th className="p-2">Ação</th><th className="p-2">Status</th></tr></thead><tbody>{result.preview.map(row=><tr key={row.line} className="border-t border-[#edf1ee]"><td className="p-2">{row.line}</td><td className="break-words p-2">{row.label}</td><td className="p-2">{row.action==="update"?`Atualizar ID ${row.existingId}`:row.action==="link"?`Reutilizar ID ${row.existingId}`:"Criar"}</td><td className="p-2">{row.status}</td></tr>)}</tbody></table></div>}
   <p className="mt-2 text-xs text-[#52666f]">Exibição limitada às primeiras 30 linhas. O arquivo completo é validado na confirmação.</p>
   {result.valid&&result.count>0&&!confirmed&&<button type="button" disabled={confirm.isPending} onClick={()=>{if(file&&window.confirm(`Confirmar ${result.toUpdate} atualização(ões), ${result.toCreate} criação(ões) e reutilização de ${result.toLink} questão(ões)? As questões existentes não terão seus dados alterados.`))confirm.mutate({kind,...file,mode:kind==="contents"?mode:"create",expectedCount:result.count,expectedUpdates:result.toUpdate,expectedLinks:result.toLink,questionDuplicateMode:kind==="questions"?questionDuplicateMode:"reject",fallbackDisciplineId:kind==="questions"?fallbackDisciplineId:undefined});}} className="action-button mt-4 min-h-11 disabled:opacity-50">{confirm.isPending?"Salvando lote…":`Confirmar: ${result.toUpdate} atualizar / ${result.toCreate} criar / ${result.toLink} reaproveitar`}</button>}
   {confirmed&&<p role="status" className="mt-4 rounded-xl bg-[#e5f2ed] p-3 text-sm font-semibold text-[#17644e]">Importação concluída. Questões existentes foram reutilizadas sem duplicação; confira a lista de vínculos e o status de publicação.</p>}
  </div>}
 </section>;
}
