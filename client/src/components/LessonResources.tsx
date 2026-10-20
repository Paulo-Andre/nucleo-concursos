import React from "react";
import { Download, ExternalLink, FileText, PlayCircle } from "lucide-react";
import { LessonVideoPlayer } from "./LessonVideoPlayer";

export type LessonResourceData = {
  title: string;
  videoUrl?: string | null;
  videoLabel?: string | null;
  materialUrl?: string | null;
  materialLabel?: string | null;
};

/** Apenas HTTP(S) ou arquivos internos da biblioteca podem virar links clicáveis. */
export function safeLessonResourceUrl(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null;
  const value = raw.trim();
  if (/^\/manus-storage\/[a-zA-Z0-9._/-]+$/.test(value) && !value.includes("..") && !value.includes("//")) return value;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "https:" || parsed.protocol === "http:" ? value : null;
  } catch {
    return null;
  }
}

export function isPdfLessonResource(url: string): boolean {
  try {
    return /\.pdf$/i.test(new URL(url, "https://example.invalid").pathname);
  } catch {
    return false;
  }
}

export function LessonResources({ content }: { content: LessonResourceData }) {
  const video = safeLessonResourceUrl(content.videoUrl);
  const material = safeLessonResourceUrl(content.materialUrl);
  const pdf = material ? isPdfLessonResource(material) : false;
  const pdfName = (content.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").slice(0, 70) || "material-aula") + ".pdf";

  return <section aria-label="Vídeo e material da aula" className="rounded-2xl border border-[#bbd7d0] bg-[#f2f9f7] p-4 sm:p-5">
    <h3 className="font-display text-base font-extrabold text-[#173d4a]">Recursos da aula</h3>
    <p className="mb-4 mt-1 text-xs leading-5 text-[#45686b]">Assista ao vídeo e consulte ou baixe o documento disponibilizado pelo professor.</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border border-[#b8d5e3] bg-white p-3">
        <div className="flex items-center gap-2 text-sm font-bold text-[#0e5a70]"><PlayCircle aria-hidden="true" className="h-5 w-5"/>Vídeo da aula</div>
        {video ? <a href="#reprodutor-da-aula" className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[#0e5a70] px-4 py-2 text-xs font-bold text-white hover:bg-[#09495a]"><PlayCircle className="h-4 w-4" aria-hidden="true" /> Reproduzir vídeo</a>
        : <p className="mt-2 text-xs text-[#687b80]">Nenhum vídeo cadastrado para esta aula.</p>}
      </div>
      <div className="rounded-xl border border-[#dbcfb3] bg-white p-3">
        <div className="flex items-center gap-2 text-sm font-bold text-[#72501d]"><FileText aria-hidden="true" className="h-5 w-5"/>Documento da aula</div>
        {material ? <div className="mt-3 flex flex-wrap gap-2">
          <a href={material} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-[#b5cfd7] px-3 py-2 text-xs font-bold text-[#0e5a70]"><ExternalLink className="h-4 w-4" aria-hidden="true"/>{pdf ? "Visualizar PDF" : "Abrir documento"}</a>
          {pdf && <a href={material} download={pdfName} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg bg-[#8a601c] px-3 py-2 text-xs font-bold text-white hover:bg-[#704c16]"><Download className="h-4 w-4" aria-hidden="true"/>Baixar PDF</a>}
        </div> : <p className="mt-2 text-xs text-[#687b80]">Nenhum PDF cadastrado para esta aula.</p>}
        {material && <p className="mt-2 text-[11px] text-[#667c7b]">{content.materialLabel || (pdf ? "Apostila em PDF" : "Material complementar")}{pdf && " · Alguns serviços externos podem abrir o PDF no navegador."}</p>}
      </div>
    </div>
    {video && <div id="reprodutor-da-aula" className="mt-4 scroll-mt-5"><LessonVideoPlayer url={video} title={content.videoLabel || content.title}/></div>}
  </section>;
}
