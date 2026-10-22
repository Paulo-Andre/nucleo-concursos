import { useMemo, useState } from "react";
import { BookOpen, HelpCircle, Search } from "lucide-react";
import { searchStudyLibrary, type SearchableLesson } from "@/lib/globalStudySearch";
import type { StudyQuestion } from "@/data/pfStudyData";

export function StudyGlobalSearchPanel({ lessons, questions, onOpenLesson, onPracticeQuestion }: {
  lessons: SearchableLesson[];
  questions: StudyQuestion[];
  onOpenLesson: (id: number) => void;
  onPracticeQuestion: (question: StudyQuestion) => void;
}) {
  const [text, setText] = useState("");
  const found = useMemo(() => searchStudyLibrary(text, lessons, questions), [text, lessons, questions]);
  const questionMap = useMemo(() => new Map(questions.map(item => [item.id, item])), [questions]);

  return <section className="shell-card p-5 sm:p-6" aria-label="Busca geral de estudos">
    <p className="eyebrow flex items-center gap-2"><Search className="h-4 w-4" aria-hidden="true"/>ENCONTRE EM UM SÓ LUGAR</p>
    <h3 className="font-display mt-2 text-xl font-bold">Busca geral de aulas e questões</h3>
    <p className="mt-2 text-sm leading-6 text-[#52666f]">Pesquise nos conteúdos e nas questões liberadas para sua matrícula. Os resultados respeitam seu curso.</p>
    <label className="mt-4 block text-sm font-semibold text-[#254751]">O que você precisa estudar?
      <input type="search" value={text} onChange={event => setText(event.target.value)} placeholder="Ex.: crase, direitos humanos, concordância" className="filter-control mt-1.5" />
    </label>
    {text.trim().length >= 2 && <div className="mt-4">
      <p role="status" aria-live="polite" className="mb-3 text-sm text-[#52666f]">{found.length} resultado(s) nesta busca {found.length===20 ? "(mostrando os 20 primeiros)" : ""}</p>
      {found.length ? <div className="grid max-h-[26rem] gap-2 overflow-y-auto" role="list">
        {found.map(item => <div key={item.kind + item.id} role="listitem">
          <button type="button" className="flex min-h-12 w-full items-start gap-3 rounded-xl border border-[#cadbd5] bg-[#f6faf8] p-3 text-left transition hover:border-[#0e5a70] focus-visible:outline-2 focus-visible:outline-[#0e5a70]"
            onClick={() => item.kind === "lesson" ? onOpenLesson(item.id) : questionMap.get(item.id) && onPracticeQuestion(questionMap.get(item.id)!)}>
            {item.kind === "lesson" ? <BookOpen className="mt-0.5 h-4 w-4 shrink-0 text-[#0e5a70]" aria-hidden="true" /> : <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#0e5a70]" aria-hidden="true" />}
            <span className="min-w-0"><span className="block text-sm font-bold leading-5 text-[#183d49]">{item.title}</span><span className="mt-1 block text-xs text-[#52666f]">{item.kind === "lesson" ? "Aula" : "Questão"} · {item.detail}</span></span>
          </button>
        </div>)}
      </div> : <p className="text-sm text-[#52666f]">Nenhum resultado disponível neste curso. Tente outro termo.</p>}
    </div>}
  </section>;
}
