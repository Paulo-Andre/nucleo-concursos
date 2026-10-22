import { useState } from "react";
import { FileSpreadsheet, ShieldCheck, AlertTriangle, Upload } from "lucide-react";
import { trpc } from "@/lib/trpc";

type Kind="contents"|"questions";
const templates:Record<Kind,string[]> = {
 contents:["titulo","objetivo","descricao","resumo_card","corpo","disciplina_ids","disciplinas","status","exigir_revisao","aviso","capa_url","video_url","video_rotulo","material_url","material_rotulo"],
 questions:["enunciado","tipo","alternativa_a","alternativa_b","alternativa_c","alternativa_d","alternativa_e","resposta","comentario","dificuldade","banca","ano","fonte","conteudo_ids","conteudos","status","exigir_revisao"],
};
export function AdminSpreadsheetImportPanel({onImported}:{onImported:()=>Promise<void>}) {
 const [kind,setKind]=useState<Kind>("contents");
 const [file,setFile]=useState<{fileName:string;base64:string}|null>(null);
 const [error,setError]=useState("");
 const [confirmed,setConfirmed]=useState(false);
 const preview=trpc.admin.spreadsheets.preview.useMutation();
 const confirm=trpc.admin.spreadsheets.confirm.useMutation({onSuccess:async data=>{
  if(data.created>0){setConfirmed(true);await onImported();}
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
   <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold">O que importar<select className="filter-control mt-1.5" value={kind} onChange={event=>{setKind(event.target.value as Kind);clear();}}><option value="contents">Conteúdos / aulas</option><option value="questions">Questões</option></select></label><label className="block text-sm font-semibold">Planilha .xlsx ou .csv<input className="mt-1.5 block w-full rounded-xl border border-[#b6d2ca] bg-white p-2 text-sm" type="file" accept=".xlsx,.csv" onChange={event=>void choose(event.target.files?.[0])}/></label></div>
   <div className="mt-3 flex flex-wrap gap-3"><button type="button" onClick={template} className="ghost-button min-h-11">Baixar modelo CSV</button><button type="button" disabled={!file||preview.isPending||confirmed} onClick={()=>{if(file)preview.mutate({kind,...file});}} className="action-button min-h-11 disabled:opacity-50"><Upload className="mr-2 inline h-4 w-4"/>Validar e visualizar</button></div>
   <p className="mt-3 text-xs leading-5 text-[#52666f]">Use `disciplina_ids` ou `disciplinas` (sigla/nome), e `conteudo_ids` ou `conteudos` (título exato). Cada item precisa de vínculo para ser encontrado pelo aluno. Arquivos .xls antigos devem ser salvos como .xlsx.</p>
  </div>
  {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  {(preview.isError||confirm.isError)&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{preview.error?.message||confirm.error?.message}</p>}
  {result&&<div className="rounded-2xl border border-[#c6ded6] bg-[#fffdf8] p-5">
   <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-[#17644e]"/><h5 className="text-lg font-bold">Prévia da importação</h5></div>
   <p className="mt-3 text-sm">{result.count} linha(s) válida(s) · {result.errors.length} erro(s). Nenhum registro é criado nesta etapa.</p>
   {result.errors.length>0&&<div role="alert" className="mt-3 rounded-xl border border-orange-200 bg-orange-50 p-4"><p className="font-semibold text-[#895a22]"><AlertTriangle className="mr-1 inline h-4 w-4"/>Corrija os erros antes de importar</p><ul className="mt-2 max-h-60 list-inside list-disc space-y-1 overflow-y-auto text-sm text-[#895a22]">{result.errors.map((e,i)=><li key={i}>{e}</li>)}</ul></div>}
   {result.preview.length>0&&<div className="mt-4 max-h-72 overflow-y-auto rounded-xl border border-[#dfebe6]"><table className="w-full table-auto text-left text-sm"><thead className="sticky top-0 bg-[#e5f2ed]"><tr><th className="p-2">Linha</th><th className="p-2">Título ou enunciado</th><th className="p-2">Status</th></tr></thead><tbody>{result.preview.map(row=><tr key={row.line} className="border-t border-[#edf1ee]"><td className="p-2">{row.line}</td><td className="break-words p-2">{row.label}</td><td className="p-2">{row.status}</td></tr>)}</tbody></table></div>}
   <p className="mt-2 text-xs text-[#52666f]">Exibição limitada às primeiras 30 linhas. O arquivo completo é validado na confirmação.</p>
   {result.valid&&result.count>0&&!confirmed&&<button type="button" disabled={confirm.isPending} onClick={()=>{if(file&&window.confirm(`Confirmar a importação de ${result.count} registro(s) no banco?`))confirm.mutate({kind,...file,expectedCount:result.count});}} className="action-button mt-4 min-h-11 disabled:opacity-50">{confirm.isPending?"Salvando lote…":`Confirmar e importar ${result.count} linha(s)`}</button>}
   {confirmed&&<p role="status" className="mt-4 rounded-xl bg-[#e5f2ed] p-3 text-sm font-semibold text-[#17644e]">Importação concluída. Conteúdos e questões estão disponíveis na gestão conforme o status de publicação.</p>}
  </div>}
 </section>;
}
