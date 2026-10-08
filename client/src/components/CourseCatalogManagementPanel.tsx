import { useState } from "react";
import { BookOpen, CheckCircle2, ImagePlus, Loader2, Pencil, PlusCircle, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { getCourseClassificationOptions } from "@/lib/courseCatalogClassification";
import { rootAccessMessage } from "@/lib/rootAccessMessage";

type ManagedCourse = {
  id: string;
  title: string;
  track: string;
  courseType: "concurso" | "tutorial";
  courseArea: string;
  stateCode: string;
  description: string | null;
  coverImageUrl: string | null;
  panelLabel: string | null;
  panelBadge: string | null;
  panelTitle: string | null;
  panelDescription: string | null;
  panelCtaText: string | null;
  isActive: boolean;
};

type CourseForm = {
  id: string;
  title: string;
  track: string;
  courseType: "concurso" | "tutorial";
  courseArea: string;
  stateCode: string;
  description: string;
  coverImageUrl: string;
  panelLabel: string;
  panelBadge: string;
  panelTitle: string;
  panelDescription: string;
  panelCtaText: string;
};

const blankCourse: CourseForm = {
  id: "",
  title: "",
  track: "",
  courseType: "concurso",
  courseArea: "Policial/Militar",
  stateCode: "Nacional",
  description: "",
  coverImageUrl: "",
  panelLabel: "",
  panelBadge: "",
  panelTitle: "",
  panelDescription: "",
  panelCtaText: "",
};

export function CourseCatalogManagementPanel() {
  const utils = trpc.useUtils();
  const coursesQuery = trpc.admin.courses.useQuery();
  const createCourse = trpc.admin.createCourse.useMutation();
  const updateCourse = trpc.admin.updateCourse.useMutation();
  const uploadCover = trpc.admin.uploadCourseCover.useMutation();
  const setCourseActive = trpc.admin.setCourseActive.useMutation();
  const deleteCourse = trpc.admin.deleteCourse.useMutation();
  const [form, setForm] = useState<CourseForm>(blankCourse);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [courseSearch, setCourseSearch] = useState("");
  const [courseStatus, setCourseStatus] = useState<"all" | "active" | "inactive">("all");
  const notify = (text: string, tone: "success" | "error" = "success") => { setMessageTone(tone); setMessage(text); };
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const classifications = getCourseClassificationOptions(form);
  const courses = coursesQuery.data ?? [];
  const visibleCourses = courses.filter(course => {
    const term = courseSearch.toLocaleLowerCase("pt-BR").trim();
    if (courseStatus === "active" && !course.isActive) return false;
    if (courseStatus === "inactive" && course.isActive) return false;
    return !term || [course.title, course.id, course.track, course.courseArea, course.stateCode].some(value => value.toLocaleLowerCase("pt-BR").includes(term));
  });

  const refresh = () => Promise.all([
    utils.admin.courses.invalidate(),
    utils.admin.stats.invalidate(),
    utils.admin.auditLogs.invalidate(),
  ]);

  const resetForm = () => {
    setEditingCourseId(null);
    setForm(blankCourse);
  };

  const editCourse = (course: ManagedCourse) => {
    setEditingCourseId(course.id);
    setMessage(null);
    window.requestAnimationFrame(() => { document.getElementById("course-form-heading")?.scrollIntoView({ behavior: "smooth", block: "start" }); document.getElementById("course-form-heading")?.focus({ preventScroll: true }); });
    setForm({
      id: course.id,
      title: course.title,
      track: course.track,
      courseType: course.courseType,
      courseArea: course.courseArea || "Policial/Militar",
      stateCode: course.stateCode || "Nacional",
      description: course.description ?? "",
      coverImageUrl: course.coverImageUrl ?? "",
      panelLabel: course.panelLabel ?? "",
      panelBadge: course.panelBadge ?? "",
      panelTitle: course.panelTitle ?? "",
      panelDescription: course.panelDescription ?? "",
      panelCtaText: course.panelCtaText ?? "",
    });
  };

  const saveCourse = async () => {
    if (!form.id.trim() || !form.title.trim() || !form.track.trim() || saving || uploading) {
      notify("Preencha código, nome e trilha antes de salvar.", "error");
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const payload = {
        title: form.title.trim(),
        track: form.track.trim().toUpperCase(),
        courseType: form.courseType,
        courseArea: form.courseArea,
        stateCode: form.stateCode,
        description: form.description.trim(),
        coverImageUrl: form.coverImageUrl,
        panelLabel: form.panelLabel.trim(),
        panelBadge: form.panelBadge.trim(),
        panelTitle: form.panelTitle.trim(),
        panelDescription: form.panelDescription.trim(),
        panelCtaText: form.panelCtaText.trim(),
      };
      if (editingCourseId) {
        await updateCourse.mutateAsync({ courseId: editingCourseId, data: payload });
        notify("Curso atualizado. A classificação será usada nos filtros da vitrine.");
      } else {
        await createCourse.mutateAsync({ ...payload, id: form.id.trim().toLowerCase() });
        notify("Curso criado. Vincule-o a um pacote publicado para exibi-lo na vitrine.");
      }
      await refresh();
      resetForm();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível salvar o curso. Revise os dados e tente novamente.", "error");
    } finally {
      setSaving(false);
    }
  };

  const sendCover = async (file?: File) => {
    if (!file) return;
    if (!( ["image/jpeg", "image/png", "image/webp"] as string[]).includes(file.type)) {
      notify("Envie uma capa JPG, PNG ou WEBP.", "error");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      notify("A capa deve ter no máximo 4 MB.", "error");
      return;
    }
    setUploading(true);
    setMessage(null);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
        reader.readAsDataURL(file);
      });
      const result = await uploadCover.mutateAsync({
        fileName: file.name,
        mimeType: file.type as "image/jpeg" | "image/png" | "image/webp",
        base64,
      });
      setForm(value => ({ ...value, coverImageUrl: result.url }));
      notify("Capa enviada. Salve o curso para vinculá-la.");
    } catch (error) {
      notify(rootAccessMessage(error), "error");
    } finally {
      setUploading(false);
    }
  };

  const toggleActive = async (course: ManagedCourse) => {
    if (course.isActive && !window.confirm(`Desativar o curso “${course.title}”? Confirme para alterar sua disponibilidade.`)) return;
    try {
      await setCourseActive.mutateAsync({ courseId: course.id, isActive: !course.isActive });
      await refresh();
      notify(`Curso “${course.title}” ${course.isActive ? "desativado" : "ativado"}.`);
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível alterar a disponibilidade.", "error");
    }
  };

  const removeCourse = async (course: ManagedCourse) => {
    const confirmation = window.prompt(`Para excluir “${course.title}”, digite o código ${course.id}.\nDisciplinas, conteúdos e questões serão preservados.`);
    if (confirmation !== course.id) return;
    try {
      await deleteCourse.mutateAsync({ courseId: course.id, confirmation });
      await refresh();
      notify(`Curso “${course.title}” excluído. A biblioteca central foi preservada.`);
      if (editingCourseId === course.id) resetForm();
    } catch (error) {
      notify(error instanceof Error ? error.message : "Não foi possível excluir o curso.", "error");
    }
  };

  const pending = saving || uploading || setCourseActive.isPending || deleteCourse.isPending;

  return <div className="flex h-full min-h-0 flex-col bg-[#fffdf8]">
    <header className="shrink-0 border-b border-[#d8d0c4] bg-[#183542] px-4 py-4 text-white sm:px-6">
      <p className="text-[10px] font-bold tracking-[0.2em] text-[#99d8ca]">ROOT / CATÁLOGO COMERCIAL</p>
      <h2 className="font-display mt-1 text-xl font-bold">Catálogo de cursos</h2>
      <p className="mt-2 max-w-3xl text-xs leading-5 text-[#d3e6e1]">Crie ou atualize as matrizes e defina os dados que compradores utilizarão para localizar os pacotes na vitrine.</p>
    </header>

    <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
      <section className="border border-[#c8dcd6] bg-[#edf7f4] p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="eyebrow text-[#176a5a]">{editingCourseId ? "EDITANDO MATRIZ" : "NOVA MATRIZ"}</p><h3 id="course-form-heading" tabIndex={-1} className="font-display mt-1 scroll-mt-4 text-lg font-bold text-[#173d4a]">{editingCourseId ? form.title || "Curso selecionado" : "Cadastrar curso"}</h3><p className="mt-1 max-w-2xl text-xs leading-5 text-[#567471]">A classificação comercial escolhida abaixo fica salva no curso e é aplicada como filtro quando ele for incluído em um pacote publicado.</p></div><BookOpen className="h-5 w-5 shrink-0 text-[#0e5a70]" /></div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-[minmax(0,.9fr)_minmax(0,1.5fr)_minmax(0,.7fr)_auto]">
          <label className="block text-sm font-semibold text-[#315a5d]">Código do curso<Input disabled={Boolean(editingCourseId)} value={form.id} onChange={event => setForm(value => ({ ...value, id: event.target.value }))} placeholder="pf-agente" className="mt-1 h-10 bg-white text-xs disabled:opacity-60" /></label>
          <label className="block text-sm font-semibold text-[#315a5d]">Nome do curso<Input value={form.title} onChange={event => setForm(value => ({ ...value, title: event.target.value }))} placeholder="Polícia Federal — Agente" className="mt-1.5 h-11 bg-white text-base sm:text-sm" /></label>
          <label className="block text-sm font-semibold text-[#315a5d]">Trilha<Input value={form.track} onChange={event => setForm(value => ({ ...value, track: event.target.value.toUpperCase() }))} placeholder="PF" className="mt-1.5 h-11 bg-white text-base sm:text-sm" /></label>
          <button type="button" disabled={pending || !form.id || !form.title || !form.track} onClick={() => void saveCourse()} className="mt-[1.1rem] flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[#87bbae] bg-[#0e5a70] px-3 text-xs font-bold text-white disabled:opacity-50"><PlusCircle className="h-4 w-4" />{saving ? "Salvando..." : editingCourseId ? "Salvar curso" : "Criar curso"}</button>
        </div>

        <fieldset className="mt-4 rounded-xl border border-[#8ebdb2] bg-white p-3"><legend className="px-1 text-[10px] font-bold tracking-[.14em] text-[#176a5a]">TIPO DO CURSO</legend><p className="mb-3 text-xs leading-5 text-[#567471]">Este campo também corresponde ao filtro por tipo na vitrine. Cursos Tutorial ocultam Simulados, Revisão e Competição para o aluno.</p><div className="grid gap-2 sm:grid-cols-2"><button type="button" onClick={() => setForm(value => ({ ...value, courseType: "concurso" }))} className={`min-h-16 rounded-lg border px-3 text-left ${form.courseType === "concurso" ? "border-[#0e5a70] bg-[#e7f4f0] text-[#0e5a70]" : "border-[#d8d0c4] text-[#526b70]"}`}><span className="block text-sm font-bold">Concurso</span><span className="mt-1 block text-[11px] leading-4">Libera todas as ferramentas de estudo.</span></button><button type="button" onClick={() => setForm(value => ({ ...value, courseType: "tutorial" }))} className={`min-h-16 rounded-lg border px-3 text-left ${form.courseType === "tutorial" ? "border-[#0e5a70] bg-[#e7f4f0] text-[#0e5a70]" : "border-[#d8d0c4] text-[#526b70]"}`}><span className="block text-sm font-bold">Tutorial</span><span className="mt-1 block text-[11px] leading-4">Conteúdo focado, sem simulados, revisão e competição.</span></button></div></fieldset>

        <section aria-labelledby="classification-title" className="mt-4 rounded-xl border border-[#c3d9d2] bg-[#f9fdfb] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h4 id="classification-title" className="text-xs font-bold text-[#173d4a]">Classificação para os filtros de busca</h4><p className="mt-1 text-[11px] leading-4 text-[#567471]">Área de atuação e Estado/abrangência aparecem como opções nos filtros da vitrine.</p></div><span className="rounded-full border border-[#a6cec4] bg-white px-2 py-1 text-[9px] font-bold tracking-wider text-[#176a5a]">VITRINE</span></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold text-[#315a5d]">Área de atuação<select value={form.courseArea} onChange={event => setForm(value => ({ ...value, courseArea: event.target.value }))} className="mt-1.5 h-11 w-full rounded-lg border border-[#cfc7ba] bg-white px-3 text-xs font-medium text-[#173d4a] outline-none focus:ring-2 focus:ring-[#82cfbf]">{classifications.areas.map(area => <option key={area} value={area}>{area}</option>)}</select></label><label className="block text-sm font-semibold text-[#315a5d]">Estado ou abrangência<select value={form.stateCode} onChange={event => setForm(value => ({ ...value, stateCode: event.target.value }))} className="mt-1.5 h-11 w-full rounded-lg border border-[#cfc7ba] bg-white px-3 text-xs font-medium text-[#173d4a] outline-none focus:ring-2 focus:ring-[#82cfbf]">{classifications.states.map(state => <option key={state} value={state}>{state}</option>)}</select></label></div></section>

        <label className="mt-4 block text-[11px] font-bold text-[#315a5d]">Descrição pedagógica<Input value={form.description} onChange={event => setForm(value => ({ ...value, description: event.target.value }))} placeholder="Descrição que aparecerá para orientar o aluno" className="mt-1.5 h-11 bg-white text-base sm:text-sm" /></label>
        <section aria-labelledby="panel-presentation-title" className="mt-4 rounded-xl border border-[#c3d9d2] bg-[#f9fdfb] p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><h4 id="panel-presentation-title" className="text-xs font-bold text-[#173d4a]">Apresentação no Painel do aluno</h4><p className="mt-1 max-w-2xl text-[11px] leading-4 text-[#567471]">Personalize o cartão principal quando este curso estiver selecionado. Campos vazios mantêm o texto padrão da plataforma.</p></div><span className="rounded-full border border-[#a6cec4] bg-white px-2 py-1 text-[9px] font-bold tracking-wider text-[#176a5a]">PAINEL</span></div><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="block text-sm font-semibold text-[#315a5d]">Texto superior<Input value={form.panelLabel} onChange={event => setForm(value => ({ ...value, panelLabel: event.target.value }))} maxLength={80} placeholder="Ex.: OPERAÇÃO DE HOJE" className="mt-1.5 h-11 bg-white text-base sm:text-sm" /></label><label className="block text-sm font-semibold text-[#315a5d]">Subtítulo / selo<Input value={form.panelBadge} onChange={event => setForm(value => ({ ...value, panelBadge: event.target.value }))} maxLength={80} placeholder="Ex.: DOSSIÊ / ABERTO" className="mt-1.5 h-11 bg-white text-base sm:text-sm" /></label><label className="block text-[11px] font-bold text-[#315a5d] sm:col-span-2">Título principal<Input value={form.panelTitle} onChange={event => setForm(value => ({ ...value, panelTitle: event.target.value }))} maxLength={240} placeholder="Ex.: Preparação é evidência acumulada." className="mt-1.5 h-11 bg-white text-base sm:text-sm" /></label><label className="block text-[11px] font-bold text-[#315a5d] sm:col-span-2">Descrição do cartão<textarea value={form.panelDescription} onChange={event => setForm(value => ({ ...value, panelDescription: event.target.value }))} maxLength={1200} placeholder="Explique como o aluno deve avançar neste curso." className="mt-1 min-h-24 w-full rounded-lg border border-[#cfc7ba] bg-white p-3 text-xs font-medium text-[#173d4a] outline-none focus:ring-2 focus:ring-[#82cfbf]" /></label><label className="block text-sm font-semibold text-[#315a5d]">Texto do botão<Input value={form.panelCtaText} onChange={event => setForm(value => ({ ...value, panelCtaText: event.target.value }))} maxLength={80} placeholder="Ex.: Abrir conteúdo" className="mt-1.5 h-11 bg-white text-base sm:text-sm" /></label></div></section>
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]"><label className="flex min-w-0 items-center gap-2 rounded-lg border border-dashed border-[#9bc8bc] bg-white px-3 py-2 text-xs font-semibold text-[#315a5d]"><ImagePlus className="h-4 w-4 shrink-0" /><input type="file" accept="image/jpeg,image/png,image/webp" className="min-w-0 text-xs" onChange={event => void sendCover(event.target.files?.[0])} /><span className="shrink-0">{uploading ? "Enviando..." : "Capa JPG, PNG ou WEBP"}</span></label>{form.coverImageUrl && <button type="button" onClick={() => setForm(value => ({ ...value, coverImageUrl: "" }))} className="rounded-lg border border-[#c8dcd6] bg-white px-3 py-2 text-xs font-bold text-[#315a5d]">Remover capa</button>}</div>
        <p className="mt-2 text-[10px] leading-4 text-[#567471]">Se a sessão administrativa tiver expirado, toque em <strong>Sair</strong>, entre novamente com o usuário <strong>paulo</strong> e escolha a imagem outra vez.</p>
        {form.coverImageUrl && <img src={form.coverImageUrl} alt="Prévia da capa do curso" className="mt-3 h-32 w-full rounded-xl border border-[#c6ddd6] object-cover" />}
        {editingCourseId && <button type="button" onClick={resetForm} className="mt-3 text-xs font-bold text-[#0e5a70] hover:underline">Cancelar edição</button>}
        {message && <p role={messageTone === "error" ? "alert" : "status"} className={`mt-4 rounded-lg border p-4 text-sm font-semibold leading-6 ${messageTone === "error" ? "border-[#d7a8a0] bg-[#fff5f2] text-[#953e38]" : "border-[#b9d6cb] bg-[#edf8f4] text-[#17644e]"}`}>{message}</p>}
      </section>

      <section className="mt-5"><div className="flex items-center justify-between gap-3"><div><p className="eyebrow">MATRIZES CADASTRADAS</p><h3 className="font-display mt-1 text-lg font-bold text-[#173d4a]">Cursos disponíveis</h3></div><span className="record-code">{courses.length} CURSOS</span></div>
         <div className="mt-4 grid gap-3 rounded-xl border border-[#c8dcd6] bg-[#edf7f5] p-4 sm:grid-cols-[minmax(0,1fr)_14rem]">
           <label className="text-sm font-semibold text-[#315a5d]">Pesquisar cursos<Input type="search" value={courseSearch} onChange={event => setCourseSearch(event.target.value)} placeholder="Nome, código, trilha ou área" className="mt-1.5 h-11 bg-white text-base sm:text-sm" /></label>
           <label className="text-sm font-semibold text-[#315a5d]">Situação<select value={courseStatus} onChange={event => setCourseStatus(event.target.value as "all" | "active" | "inactive")} className="mt-1.5 h-11 w-full rounded-lg border border-[#cfc7ba] bg-white px-3 text-base sm:text-sm"><option value="all">Todos os cursos</option><option value="active">Ativos</option><option value="inactive">Inativos</option></select></label>
         </div>
         <p role="status" aria-live="polite" className="mt-3 text-sm font-medium text-[#52716f]">{visibleCourses.length} curso{visibleCourses.length === 1 ? "" : "s"} encontrado{visibleCourses.length === 1 ? "" : "s"}</p>
         {coursesQuery.isLoading ? <div role="status" className="mt-4 flex min-h-40 items-center justify-center gap-2 border border-[#d8d0c4] bg-white text-sm text-[#52716f]"><Loader2 className="h-5 w-5 animate-spin text-[#0e5a70]" aria-hidden="true" />Carregando cursos...</div> : coursesQuery.isError ? <div role="alert" className="mt-4 rounded-xl border border-[#d7a8a0] bg-[#fff5f2] p-5 text-sm text-[#953e38]">Não foi possível carregar os cursos. <button type="button" onClick={() => void coursesQuery.refetch()} className="ml-2 min-h-11 font-bold underline">Tentar novamente</button></div> : !visibleCourses.length ? <div className="mt-4 rounded-xl border border-dashed border-[#d8d0c4] bg-white p-6 text-center"><p className="text-sm font-semibold text-[#315a5d]">{courses.length ? "Nenhum curso corresponde aos filtros." : "Nenhum curso cadastrado."}</p>{courses.length > 0 && <button type="button" onClick={() => { setCourseSearch(""); setCourseStatus("all"); }} className="ghost-button mt-3">Limpar filtros</button>}</div> : <div className="mt-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-3">{visibleCourses.map(course => <article key={course.id} className="overflow-hidden border border-[#c6ddd6] bg-white"><div className="relative h-28 bg-[#dcece7]">{course.coverImageUrl ? <img src={course.coverImageUrl} alt={`Capa de ${course.title}`} className="h-full w-full object-cover" /> : <div className="grid h-full place-items-center text-[10px] font-bold tracking-wider text-[#52716f]">SEM CAPA</div>}</div><div className="p-3"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="text-[10px] font-bold tracking-wider text-[#176a5a]">{course.track} · {course.courseType === "tutorial" ? "TUTORIAL" : "CONCURSO"}</p><h4 className="mt-1 break-words text-sm font-bold text-[#173d4a]">{course.title}</h4><p className="mt-1 text-[10px] text-[#657b7d]">{course.id}</p></div><button disabled={pending} onClick={() => void toggleActive(course)} className={`min-h-11 shrink-0 rounded-lg border px-3 py-2 text-xs font-bold ${course.isActive ? "border-[#a8d0c4] bg-[#ebf7f3] text-[#176a5a]" : "border-[#d7b8aa] bg-[#fff1ec] text-[#99462e]"}`}>{course.isActive ? "Ativo · desativar" : "Inativo · ativar"}</button></div><p className="mt-3 border-t border-[#e4ddd1] pt-3 text-[10px] font-semibold text-[#567471]">Filtros: {course.courseArea} · {course.stateCode}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2"><button disabled={pending} onClick={() => editCourse(course)} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-bold text-[#0e5a70] hover:bg-[#edf7f5]"><Pencil className="h-3.5 w-3.5" />Editar</button><button disabled={pending} onClick={() => void removeCourse(course)} className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-bold text-[#a24932] hover:bg-[#fff1ec]"><Trash2 className="h-3.5 w-3.5" />Excluir</button></div></div></article>)}</div>}</section>
    </main>
  </div>;
}
