import { useMemo, useState } from "react";
import { Brain, CalendarCheck2, BookOpenCheck, Layers3, Target, Plus, Check, Trash2 } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { StudyFocusTimer } from "@/components/StudyFocusTimer";
import { StudyGlobalSearchPanel } from "@/components/StudyGlobalSearchPanel";
import { StudyEditalChecklist } from "@/components/StudyEditalChecklist";
import type { StudyQuestion } from "@/data/pfStudyData";

type ContentOption = { id: number; title: string; disciplineName: string; progress: {status: "started" | "completed"} | null };
const reasonLabels: Record<string,string> = {nao_classificado:"Não classificado", desatencao:"Desatenção",conteudo:"Falta de domínio", interpretacao:"Interpretação",tempo:"Tempo"};
const ratingLabels: Record<string,string> = {again:"Não lembrei",hard:"Difícil",good:"Lembrei",easy:"Muito fácil"};

export function StudyCoachPanel({courseId, contents, questions, onOpenContent, onPracticeQuestion}:{
  courseId: string; contents: ContentOption[]; questions: StudyQuestion[];
  onOpenContent: (id: number) => void;
  onPracticeQuestion: (question: StudyQuestion) => void;
}) {
 const [minutes,setMinutes] = useState<20|40|60>(40);
 const [newFront,setNewFront] = useState("");
 const [newBack,setNewBack] = useState("");
 const [selectedContent,setSelectedContent] = useState("");
 const [revealed,setRevealed] = useState<string|null>(null);
 const [expandedError,setExpandedError] = useState<string|null>(null);
 const [errorInputs,setErrorInputs] = useState<Record<string,{reason:string;observation:string}>>({});
 const [notice,setNotice] = useState("");
 const utils=trpc.useUtils();
 const overview=trpc.study.coach.overview.useQuery({courseId,minutes},{retry:false});
 const cards=trpc.study.coach.flashcards.useQuery({courseId},{retry:false});
 const errors=trpc.study.coach.errors.useQuery({courseId},{retry:false});
 const refreshCards=async()=>{await Promise.all([utils.study.coach.flashcards.invalidate({courseId}),utils.study.coach.overview.invalidate()]);};
 const add=trpc.study.coach.addFlashcard.useMutation({onSuccess:async()=>{setNewFront("");setNewBack("");setNotice("Flashcard criado. Ele já está disponível para revisar.");await refreshCards();},onError:e=>setNotice(e.message)});
 const rate=trpc.study.coach.rateFlashcard.useMutation({onSuccess:async()=>{setRevealed(null);await refreshCards();},onError:e=>setNotice(e.message)});
 const remove=trpc.study.coach.removeFlashcard.useMutation({onSuccess:refreshCards,onError:e=>setNotice(e.message)});
 const classify=trpc.study.coach.classifyError.useMutation({onSuccess:async()=>{setExpandedError(null);await utils.study.coach.errors.invalidate({courseId});},onError:e=>setNotice(e.message)});
 const allowed = useMemo(()=>contents.filter(c=>c.id>0),[contents]);
 const selected = selectedContent && allowed.some(c=>String(c.id)===selectedContent) ? selectedContent : String(allowed[0]?.id??"");
 const due=cards.data?.filter(card=>card.due)??[];
 const upcoming=cards.data?.filter(card=>!card.due)??[];
 const current = overview.data;
 return <div className="space-y-6" aria-label="Treinador de aprendizagem">
   <header className="border-b border-[#d7cfc1] pb-5"><p className="eyebrow">ESTUDO BASEADO EM EVIDÊNCIAS</p><h2 className="font-display mt-2 text-2xl font-extrabold sm:text-3xl">Seu treinador de estudos</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-[#52666f]">Planejamento diário, revisão espaçada e recuperação dos pontos fracos. As recomendações usam suas respostas e conteúdos autorizados.</p></header>
   <StudyGlobalSearchPanel lessons={contents} questions={questions} onOpenLesson={onOpenContent} onPracticeQuestion={onPracticeQuestion}/>
   <StudyFocusTimer/>
   {notice&&<p role="status" className="rounded-xl border border-[#bcd8d0] bg-[#edf7f4] p-3 text-sm text-[#245c5c]">{notice}</p>}
   {(overview.isError||cards.isError||errors.isError)&&<div role="alert" className="rounded-xl border border-[#e7b2a7] bg-[#fff5ee] p-4 text-sm text-[#903b2a]">Não foi possível carregar alguns recursos. <button type="button" className="font-bold underline" onClick={()=>{void overview.refetch();void cards.refetch();void errors.refetch();}}>Tentar novamente</button></div>}
   <section className="shell-card p-5 sm:p-6" aria-label="Plano diário">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow flex items-center gap-2"><CalendarCheck2 className="h-4 w-4"/>PLANO ADAPTATIVO</p><h3 className="font-display mt-2 text-xl font-bold">O que estudar hoje</h3></div><label className="text-sm font-semibold text-[#254751]">Tempo disponível<select aria-label="Tempo disponível de estudo" className="filter-control mt-1.5" value={minutes} onChange={event=>setMinutes(Number(event.target.value) as 20|40|60)}><option value={20}>20 minutos</option><option value={40}>40 minutos</option><option value={60}>60 minutos</option></select></label></div>
    <p className="mt-3 text-sm text-[#52666f]">Aulas iniciadas e disciplinas com menor acerto aparecem primeiro. O plano é uma sugestão e não impede que você estude outros temas.</p>
    {overview.isLoading?<p className="mt-4 text-sm">Preparando seu roteiro...</p>:current?.today.length?<div className="mt-4 grid gap-3 md:grid-cols-2">{current.today.map((item,index)=><button key={item.contentId} onClick={()=>onOpenContent(item.contentId)} className="rounded-xl border border-[#c7dcd5] bg-[#f5faf8] p-4 text-left transition hover:border-[#0e5a70] focus-visible:outline-2 focus-visible:outline-[#0e5a70]"><span className="text-xs font-bold text-[#0e5a70]">PASSO {index+1} · {item.minutes} MIN</span><h4 className="mt-1 text-base font-bold">{item.title}</h4><p className="mt-1 text-sm text-[#536d72]">{item.disciplineName} · {item.reason}</p><span className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-[#0e5a70]"><BookOpenCheck className="h-4 w-4"/>Abrir aula</span></button>)}</div>:<p className="mt-5 text-sm text-[#52666f]">Não há conteúdos pendentes para este curso.</p>}
   </section>
   <StudyEditalChecklist contents={contents} onOpen={onOpenContent}/>
   <section className="shell-card p-5 sm:p-6" aria-label="Diagnóstico de disciplinas">
    <p className="eyebrow flex items-center gap-2"><Target className="h-4 w-4"/>MAPA DE DOMÍNIO</p><h3 className="font-display mt-2 text-xl font-bold">Diagnóstico por disciplina</h3>
    <p className="mt-2 text-sm text-[#52666f]">Indicadores calculados por questões respondidas. Menos de dez questões representam uma amostra pequena.</p>
    <div className="mt-4 grid gap-3 md:grid-cols-2">{(current?.disciplines??[]).map(d=><article key={d.name} className="rounded-xl border border-[#dae4df] bg-white p-4"><div className="flex items-center justify-between gap-3"><h4 className="text-sm font-semibold">{d.name}</h4><span className="text-sm font-bold text-[#0e5a70]">{d.accuracy===null?"Sem dados":`${d.accuracy}%`}</span></div><div role="progressbar" aria-label={`Aproveitamento em ${d.name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={d.accuracy??0} className="mt-3 h-2 overflow-hidden rounded-full bg-[#dde7e3]"><div style={{width:`${d.accuracy??0}%`}} className="h-full rounded-full bg-[#0e5a70]"/></div><p className="mt-2 text-xs text-[#536d72]">{d.total} questões avaliadas · {d.confidence==="amostra_pequena"?"Amostra inicial":"Amostra suficiente"}</p></article>)}</div>
    <p className="mt-4 text-xs leading-5 text-[#536d72]">{current?.caution}</p>
   </section>
   <section className="shell-card p-5 sm:p-6" aria-label="Flashcards">
    <p className="eyebrow flex items-center gap-2"><Layers3 className="h-4 w-4"/>RECUPERAÇÃO ATIVA</p><div className="mt-2 flex flex-wrap items-end justify-between gap-3"><h3 className="font-display text-xl font-bold">Flashcards inteligentes</h3><span className="rounded-xl bg-[#e5f2ed] px-3 py-2 text-sm font-semibold text-[#17644e]">{due.length} para revisar hoje</span></div>
    <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr]">
      <div className="space-y-3"><h4 className="font-bold text-[#173d4a]">Cartões para revisar</h4>{due.length?due.slice(0,25).map(card=><article key={card.id} className="rounded-xl border border-[#bfd9d1] bg-[#f4faf7] p-4"><p className="font-semibold text-[#1b3e48]">{card.front}</p>{revealed===card.id?<><p className="mt-3 rounded-lg bg-white p-3 text-sm leading-6">{card.back}</p><p className="mt-3 text-xs text-[#536d72]">Como foi lembrar desta resposta?</p><div className="mt-2 flex flex-wrap gap-2">{(["again","hard","good","easy"] as const).map(value=><button type="button" disabled={rate.isPending} onClick={()=>rate.mutate({courseId,id:card.id,rating:value})} key={value} className="min-h-11 rounded-lg border border-[#90bdb2] bg-white px-3 text-sm font-medium text-[#15566a]">{ratingLabels[value]}</button>)}</div></>:<button type="button" onClick={()=>setRevealed(card.id)} className="mt-3 min-h-11 rounded-lg bg-[#0e5a70] px-4 text-sm font-bold text-white">Mostrar resposta</button>}</article>):<p className="rounded-xl border border-dashed border-[#c8d6d1] p-4 text-sm text-[#52666f]">Nenhum cartão vencido. Você pode criar novos cartões ao lado.</p>}{upcoming.length>0&&<p className="text-xs text-[#536d72]">{upcoming.length} cartão(ões) agendado(s) para datas futuras.</p>}</div>
      <form onSubmit={event=>{event.preventDefault();if(selected)add.mutate({courseId,contentId:Number(selected),front:newFront,back:newBack});}} className="rounded-xl border border-[#d6e4dd] bg-white p-4"><h4 className="flex items-center gap-2 font-bold"><Plus className="h-4 w-4"/>Criar flashcard</h4><label className="mt-3 block text-sm font-medium">Aula<select value={selected} onChange={event=>setSelectedContent(event.target.value)} className="filter-control mt-1">{allowed.map(item=><option key={item.id} value={item.id}>{item.title}</option>)}</select></label><label className="mt-3 block text-sm font-medium">Pergunta<input className="filter-control mt-1" minLength={3} maxLength={350} required value={newFront} onChange={event=>setNewFront(event.target.value)} placeholder="O que preciso lembrar?"/></label><label className="mt-3 block text-sm font-medium">Resposta<textarea className="filter-control mt-1 min-h-28" minLength={2} maxLength={1600} required value={newBack} onChange={event=>setNewBack(event.target.value)} placeholder="Explique com suas palavras."/></label><button type="submit" disabled={add.isPending||!selected} className="action-button mt-3 min-h-11 w-full disabled:opacity-50">Salvar flashcard</button><p className="mt-3 text-xs text-[#52666f]">Seus cartões são privados e sincronizados no servidor entre dispositivos.</p></form>
    </div>
    {(cards.data?.length??0)>0&&<details className="mt-4"><summary className="cursor-pointer text-sm font-semibold text-[#0e5a70]">Gerenciar todos os cartões ({cards.data?.length??0})</summary><div className="mt-3 space-y-2">{cards.data?.map(card=><div key={card.id} className="flex items-center justify-between gap-3 border-b p-2"><div className="min-w-0"><p className="text-sm font-semibold">{card.front}</p><p className="text-xs text-[#536d72]">Próxima revisão: {new Date(card.schedule.dueAt).toLocaleDateString("pt-BR")}</p></div><button type="button" aria-label={`Excluir cartão: ${card.front}`} disabled={remove.isPending} onClick={()=>{if(window.confirm("Excluir este flashcard?"))remove.mutate({courseId,id:card.id});}} className="min-h-11 shrink-0 rounded-lg border border-[#d7b4a8] p-3 text-[#8e4f31]"><Trash2 className="h-4 w-4"/></button></div>)}</div></details>}
   </section>
   <section className="shell-card p-5 sm:p-6" aria-label="Caderno de erros"><p className="eyebrow flex items-center gap-2"><Brain className="h-4 w-4"/>ANÁLISE DE FALHAS</p><h3 className="font-display mt-2 text-xl font-bold">Meu caderno de erros</h3><p className="mt-2 text-sm text-[#52666f]">Classifique o motivo de cada erro para revisar a causa, não apenas o gabarito.</p>
    {errors.isLoading?<p className="mt-4 text-sm">Carregando erros...</p>:errors.data?.length?<div className="mt-4 space-y-3">{errors.data.map(item=><article key={item.questionId} className="rounded-xl border border-[#e2d8cd] bg-white p-4"><p className="text-xs font-bold text-[#0e5a70]">{item.discipline}</p><h4 className="mt-1 text-sm font-semibold">{item.statement}</h4><p className="mt-2 text-xs text-[#6a5b50]">Motivo: {reasonLabels[item.reason]??item.reason}</p>{expandedError===item.questionId?<div className="mt-3 space-y-3"><label className="block text-sm font-medium">Qual foi a causa?<select className="filter-control mt-1" value={errorInputs[item.questionId]?.reason??item.reason} onChange={event=>setErrorInputs(v=>({...v,[item.questionId]:{reason:event.target.value,observation:v[item.questionId]?.observation??item.observation}}))}>{Object.entries(reasonLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><label className="block text-sm font-medium">Minha observação<textarea className="filter-control mt-1 min-h-20" value={errorInputs[item.questionId]?.observation??item.observation} onChange={event=>setErrorInputs(v=>({...v,[item.questionId]:{reason:v[item.questionId]?.reason??item.reason,observation:event.target.value}}))}/></label><button type="button" disabled={classify.isPending} className="action-button min-h-11" onClick={()=>{const values=errorInputs[item.questionId];classify.mutate({courseId,questionId:item.questionId,reason:(values?.reason??item.reason) as "nao_classificado"|"desatencao"|"conteudo"|"interpretacao"|"tempo",observation:values?.observation??item.observation});}}>Salvar análise</button></div>:<button type="button" className="mt-2 min-h-11 text-sm font-semibold text-[#0e5a70] underline" onClick={()=>setExpandedError(item.questionId)}>Analisar erro</button>}</article>)}</div>:<p className="mt-4 text-sm text-[#52666f]">Nenhum erro recente em questões publicadas deste curso.</p>}
   </section>
  </div>;
}
