/**
 * Estilo Arquivo Operacional: leitura calma, hierarquia documental e contraste azul-petróleo.
 * A teoria é apresentada como uma apostila de estudo autônomo, sem substituir os desafios ativos.
 */
import { useEffect, useRef, useState } from "react";
import { Award, BookOpen, Brain, Check, ExternalLink, Loader2, Sparkles, X } from "lucide-react";
import type { DetailedStudyModule } from "@/data/pfCompleteStudyData";
import type { ApostilaChapter } from "@/data/pfApostilaData";
import { curatedVideoForModule } from "@/data/pfCuratedVideos";
import { trpc } from "@/lib/trpc";
import { LessonVideoPlayer } from "@/components/LessonVideoPlayer";

type Props = {
  module: DetailedStudyModule;
  chapter: ApostilaChapter;
  completed: boolean;
  onComplete: () => void;
  onClose: () => void;
};

export function ApostilaModulePanel({ module, chapter, completed, onComplete, onClose }: Props) {
  const [challengeAnswer, setChallengeAnswer] = useState<number | null>(null);
  const [revealRecall, setRevealRecall] = useState(false);
  const [note, setNote] = useState("");
  const [noteStatus, setNoteStatus] = useState<"idle" | "saved">("idle");
  const [noteEdited, setNoteEdited] = useState(false);
  const [noteError, setNoteError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const noteQuery = trpc.study.note.useQuery({ moduleId: module.id });
  const saveNote = trpc.study.saveNote.useMutation({
    onSuccess: () => { setNoteStatus("saved"); setNoteEdited(false); setNoteError(null); },
    onError: (error) => { setNoteStatus("idle"); setNoteError(error.message || "Não foi possível salvar. Tente novamente."); },
  });
  const isCorrect = challengeAnswer === module.lesson.challenge.correct;
  const video = curatedVideoForModule(module.id);
  const closeLesson = () => {
    if (noteEdited && !window.confirm("Sua anotação ainda não foi salva. Deseja sair mesmo assim?")) return;
    onClose();
  };
  const finishLesson = () => {
    if (noteEdited && !window.confirm("Sua anotação ainda não foi salva. Deseja concluir a aula sem salvá-la?")) return;
    onComplete();
    onClose();
  };

  useEffect(() => {
    if (!noteEdited && noteQuery.data?.content !== undefined) setNote(noteQuery.data.content);
  }, [noteQuery.data?.content]);

  useEffect(() => {
    setChallengeAnswer(null);
    setRevealRecall(false);
    setNote("");
    setNoteStatus("idle");
    setNoteError(null);
    setNoteEdited(false);
  }, [module.id]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    return () => previousFocus?.focus();
  }, []);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#152d38]/55 p-3 backdrop-blur-sm">
      <article ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="study-lesson-title" onKeyDown={event => { if (event.key === "Escape") { event.stopPropagation(); closeLesson(); } }} className="max-h-[92vh] w-full max-w-4xl overflow-y-auto rounded-[1.35rem] bg-[#fffdf8] shadow-2xl outline-none">
        <header className="sticky top-0 z-10 flex items-start justify-between border-b border-[#e6ded1] bg-[#fffdf8]/95 p-5 backdrop-blur">
          <div>
            <p className="eyebrow">APOSTILA DIGITAL · {module.code} · BLOCO {module.block}</p>
            <h2 id="study-lesson-title" className="font-display mt-1 text-xl font-bold text-[#17343e]">{module.title}</h2>
            <p className="mt-1 text-xs text-[#687780]">Roteiro de leitura, aplicação e recuperação ativa · {module.estimatedMinutes} min</p>
          </div>
          <button type="button" onClick={closeLesson} aria-label="Fechar aula" className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-[#ded6c9] transition hover:border-[#0e5a70] hover:text-[#0e5a70]">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="space-y-7 p-5 sm:p-7">
          <section className="overflow-hidden rounded-2xl border border-[#b8d6d0] bg-[#edf7f4]">
            <div className="border-b border-[#c8ded8] bg-[#dff0ec] px-5 py-3">
              <p className="eyebrow text-[#19705d]">VISÃO GERAL DA AULA</p>
            </div>
            <div className="p-5">
              <p className="text-[15px] leading-7 text-[#285d55]">{chapter.abertura}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {module.concepts.slice(0, 6).map((concept) => <span key={concept} className="rounded-full border border-[#a9d0c5] bg-white/70 px-3 py-1 text-[11px] font-bold text-[#176a5a]">{concept}</span>)}
              </div>
            </div>
          </section>

          <section aria-labelledby="teoria-completa">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2 border-b border-[#d7cfc1] pb-3">
              <div>
                <p id="teoria-completa" className="eyebrow">TEORIA COMPLETA</p>
                <h3 className="font-display mt-1 text-xl font-bold text-[#17343e]">Leia, conecte e explique com suas palavras.</h3>
              </div>
              <span className="rounded-lg bg-[#e7f0ee] px-2.5 py-1 text-[10px] font-bold tracking-wider text-[#0e5a70]">{chapter.secoes.length} NÚCLEOS DE ESTUDO</span>
            </div>

            <div className="space-y-5">
              {chapter.secoes.map((section, index) => (
                <section key={`${section.titulo}-${index}`} className="overflow-hidden rounded-2xl border border-[#e6ded1] bg-[#fffdf8]">
                  <div className="flex items-center gap-3 border-b border-[#eee6da] bg-[#faf7f0] px-5 py-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#dceee9] font-display text-xs font-bold text-[#0e5a70]">{index + 1}</span>
                    <h4 className="font-display text-base font-bold text-[#23424d]">{section.titulo}</h4>
                  </div>
                  <div className="space-y-4 p-5">
                    {section.paragrafos.map((paragraph, paragraphIndex) => <p key={paragraphIndex} className="text-[15px] leading-7 text-[#405861]">{paragraph}</p>)}
                    {section.esquema && (
                      <div className="rounded-xl border border-[#cbded9] bg-[#f3f9f7] p-4">
                        <p className="text-[10px] font-bold tracking-[0.16em] text-[#19705d]">ESQUEMA DE MEMORIZAÇÃO</p>
                        <div className="mt-3 grid gap-2 sm:grid-cols-2">
                          {section.esquema.map((item) => <div key={item} className="flex gap-2 text-sm leading-5 text-[#316259]"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16806b]" /><span>{item}</span></div>)}
                        </div>
                      </div>
                    )}
                    {section.exemplo && (
                      <div className="rounded-xl border border-[#efdbb8] bg-[#fff7ea] p-4">
                        <p className="text-[10px] font-bold tracking-[0.16em] text-[#9a6427]">EXEMPLO RESOLVIDO</p>
                        <p className="mt-2 text-sm font-semibold leading-6 text-[#674d2a]"><strong>Situação:</strong> {section.exemplo.enunciado}</p>
                        <p className="mt-3 border-l-2 border-[#d49a45] pl-3 text-sm leading-6 text-[#785b31]"><strong>Raciocínio:</strong> {section.exemplo.resolucao}</p>
                      </div>
                    )}
                  </div>
                </section>
              ))}
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-[1.15fr_.85fr]">
            <div className="rounded-2xl bg-[#183542] p-5 text-[#eef5f3]">
              <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-[#93d6c6]" /><p className="text-[10px] font-bold tracking-[0.18em] text-[#93d6c6]">PRÁTICA ATIVA</p></div>
              <p className="font-display mt-3 text-lg font-bold leading-7">{chapter.praticaAtiva}</p>
              <p className="mt-3 text-xs leading-5 text-[#c8d9d8]">Feche esta aula por um minuto, explique o ponto principal e só então confira o que esqueceu.</p>
            </div>
            <div className="rounded-2xl border border-[#f0d5ab] bg-[#fff4e5] p-5">
              <p className="eyebrow text-[#9a6427]">ATENÇÃO DE PROVA</p>
              <ul className="mt-3 space-y-2 text-sm leading-6 text-[#6d542f]">
                {module.attention.map((item) => <li key={item} className="flex gap-2"><span>•</span><span>{item}</span></li>)}
              </ul>
              <p className="mt-4 border-t border-[#efd6b5] pt-3 text-xs font-bold leading-5 text-[#876432]">Gatilho: {module.mnemonic}</p>
            </div>
          </section>

          {chapter.fonteOficial && (
            <section className="rounded-2xl border border-[#c6d8d5] bg-[#f7fcfa] p-5">
              <p className="eyebrow text-[#19705d]">LEI SECA / FONTE OFICIAL</p>
              <a href={chapter.fonteOficial.url} target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-2 font-display text-base font-bold text-[#0e5a70] underline decoration-[#9cc8be] underline-offset-4 hover:text-[#174a5a]">
                {chapter.fonteOficial.rotulo}<ExternalLink className="h-4 w-4" />
              </a>
              <p className="mt-2 text-sm leading-6 text-[#41635f]">{chapter.fonteOficial.nota}</p>
            </section>
          )}

          {video && <LessonVideoPlayer url={video.url} title={video.title} channel={video.channel} note={video.note} />}

          <section className="rounded-2xl border border-[#c9dbd6] bg-[#f6fbfa] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="eyebrow text-[#19705d]">ANOTAÇÃO PRIVADA</p><h3 className="font-display mt-1 text-lg font-bold text-[#173d4a]">Registre o que precisa recuperar.</h3></div><span className="text-[10px] font-bold tracking-wide text-[#5a7778]">SOMENTE SUA CONTA</span></div>
            <label htmlFor="lesson-private-note" className="mt-4 block text-sm font-semibold text-[#315a5d]">Sua anotação sobre esta aula</label><textarea id="lesson-private-note" value={note} disabled={noteQuery.isLoading || noteQuery.isError} onChange={event => { setNote(event.target.value); setNoteEdited(true); setNoteStatus("idle"); setNoteError(null); }} maxLength={12000} placeholder="Ex.: revisar exceção, criar exemplo próprio, retomar lei seca..." className="mt-1.5 min-h-32 w-full rounded-xl border border-[#ccd8d4] bg-white p-3 text-base leading-7 text-[#314f58] focus-visible:border-[#0e5a70]" />
            <div className="mt-3 flex items-center justify-between gap-3"><p role="status" aria-live="polite" className="text-sm leading-5 text-[#61767b]">{noteStatus === "saved" ? "Anotação salva na sua conta." : noteEdited ? "Alterações ainda não salvas." : "Esta anotação pertence à sua conta."}</p><button type="button" onClick={() => saveNote.mutate({ moduleId: module.id, content: note })} disabled={saveNote.isPending || noteQuery.isLoading || noteQuery.isError} className="ghost-button border-[#97c5bb] text-[#0e5a70] disabled:opacity-60">{saveNote.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}{saveNote.isPending ? "Salvando..." : "Salvar anotação"}</button></div>
            {noteQuery.isLoading && <p role="status" className="mt-2 text-sm text-[#61767b]">Carregando sua anotação...</p>}
            {noteQuery.isError && <p role="alert" className="mt-2 text-sm text-[#953e38]">Não foi possível carregar a anotação existente. Tente recarregar esta aula antes de salvar.</p>}
            {noteError && <p role="alert" className="mt-2 rounded-lg border border-[#d7a8a0] bg-[#fff5f2] px-3 py-2 text-sm text-[#953e38]">{noteError}</p>}
          </section>

          <section className="rounded-2xl border border-[#c8ddd7] bg-[#f7fcfa] p-5">
            <div className="flex items-center gap-2"><Brain className="h-5 w-5 text-[#0e5a70]" /><div><p className="eyebrow">DESAFIO DE 30 SEGUNDOS</p><h3 className="font-display mt-1 text-lg font-bold text-[#173d4a]">Teste a compreensão antes de avançar.</h3></div></div>
            <p className="mt-4 text-[15px] leading-7 text-[#2c515c]">{module.lesson.challenge.prompt}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {module.lesson.challenge.options.map((option, index) => {
                const selected = challengeAnswer === index;
                const selectedCorrect = selected && index === module.lesson.challenge.correct;
                return <button type="button" key={option} aria-pressed={selected} onClick={() => setChallengeAnswer(index)} className={`min-h-14 rounded-xl border-2 p-4 text-left text-sm font-bold transition ${selected ? selectedCorrect ? "border-[#16806b] bg-[#e4f3ed] text-[#17644e]" : "border-[#c5663e] bg-[#f8e8de] text-[#913f22]" : "border-[#d8d0c3] bg-white text-[#36505a] hover:border-[#0e5a70]"}`}><span className="text-[10px] tracking-wider text-[#718087]">ALTERNATIVA {index + 1}</span><span className="mt-1 block">{option}</span></button>;
              })}
            </div>
            {challengeAnswer !== null && <div role="status" aria-live="polite" className={`mt-4 rounded-xl p-4 text-sm leading-6 ${isCorrect ? "bg-[#e4f3ed] text-[#17644e]" : "bg-[#f8e8de] text-[#913f22]"}`}><p><strong>{isCorrect ? "Resposta correta. " : "Resposta incorreta. "}</strong>{module.lesson.challenge.feedback}</p><p className="mt-2 font-semibold">Resposta correta: {module.lesson.challenge.options[module.lesson.challenge.correct]}</p></div>}
          </section>

          <section className="rounded-2xl border border-[#d8cec0] bg-[#faf7f0] p-5">
            <p className="eyebrow">REVISÃO ATIVA · SEM CONSULTAR</p>
            <p className="font-display mt-2 text-lg font-bold text-[#25434e]">{module.lesson.recall.prompt}</p>
            {revealRecall ? <div className="mt-4 rounded-xl bg-[#e8f0ee] p-4 text-sm leading-6 text-[#285d55]"><strong>Resposta:</strong> {module.lesson.recall.answer}</div> : <button onClick={() => setRevealRecall(true)} className="ghost-button mt-4"><Sparkles className="h-4 w-4" />Ver resposta e conferir</button>}
          </section>

          <section>
            <p className="eyebrow mb-3">MAPA DO EDITAL NESTA AULA</p>
            <div className="grid gap-2 sm:grid-cols-2">{module.checklist.map((item) => <div key={item} className="flex gap-2 rounded-xl border border-[#e7dfd2] bg-[#fffdf8] px-3 py-3 text-sm leading-5 text-[#415a62]"><Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#16806b]" /><span>{item}</span></div>)}</div>
          </section>

          <footer className="flex flex-col-reverse gap-3 border-t border-[#e6ded1] pt-5 sm:flex-row sm:justify-end">
            <button type="button" onClick={closeLesson} className="ghost-button">Voltar às aulas</button>
            <button type="button" onClick={finishLesson} disabled={completed} className="action-button disabled:cursor-default disabled:bg-[#6e969c]">{completed ? <><Check className="h-4 w-4" />Aula concluída</> : <><Award className="h-4 w-4" />Concluir aula · +20 XP</>}</button>
          </footer>
        </div>
      </article>
    </div>
  );
}
