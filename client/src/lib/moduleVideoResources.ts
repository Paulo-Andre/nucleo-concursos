import { curatedVideoForModule } from "@/data/pfCuratedVideos";
import type { LessonResourceData } from "@/components/LessonResources";

/**
 * Usa o vídeo definido pelo professor, caso exista. Senão, mantém disponível
 * a videoaula de referência da disciplina já associada ao módulo legado.
 */
export function resourcesForModule(moduleId: string, content: LessonResourceData): LessonResourceData {
  if (content.videoUrl?.trim()) return content;

  const reference = curatedVideoForModule(moduleId);
  if (!reference) return content;

  return {
    ...content,
    videoUrl: reference.url,
    videoLabel: reference.title,
    videoChannel: reference.channel,
    videoNote: reference.note,
    videoOrigin: "discipline",
  };
}
