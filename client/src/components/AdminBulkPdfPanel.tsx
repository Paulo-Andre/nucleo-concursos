import { useState } from "react";
import { FileText, Upload, AlertTriangle, CheckCircle2 } from "lucide-react";
import { trpc } from "@/lib/trpc";

type Discipline = { id: number; name: string; shortName: string };
const MAX_PDFS = 100;
const MAX_PDF_SIZE = 10 * 1024 * 1024;

function readPdfAsBase64(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error(`Falha ao ler ${file.name}.`));
    reader.onload = () => {
      const encoded = typeof reader.result === "string" ? reader.result.split(",")[1] : null;
      if (encoded) resolve(encoded);
      else reject(new Error(`O arquivo ${file.name} está vazio.`));
    };
    reader.readAsDataURL(file);
  });
}

export function AdminBulkPdfPanel({ disciplines, onImported }: {
  disciplines: Discipline[];
  onImported: () => Promise<void>;
}) {
  const [disciplineId, setDisciplineId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [mappingSearch, setMappingSearch] = useState("");
  const [onlyPending, setOnlyPending] = useState(false);
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const [targetKeys, setTargetKeys] = useState<Record<string, string>>({});
  const [chosenContents, setChosenContents] = useState<Record<string, number[]>>({});
  const [editingContentsFor, setEditingContentsFor] = useState<string | null>(null);
  const [contentFilter, setContentFilter] = useState("");
  const [needsRevalidation, setNeedsRevalidation] = useState(false);
  const [postTargets, setPostTargets] = useState<Record<string, string>>({});
  const [allowReplaceTarget, setAllowReplaceTarget] = useState(false);
  const selectedDiscipline = disciplines.find(item => String(item.id) === disciplineId);
  const pdfExample = (selectedDiscipline?.shortName || "DISC") + "_Aula_01.pdf";
  const mappingHint = "O nome do PDF é apenas uma sugestão. Se não houver correspondência automática, escolha o grupo ou os conteúdos cadastrados, sem exigir prefixos fixos.";
  const preview = trpc.admin.pdfBatches.preview.useMutation();
  const [plan, setPlan] = useState<Awaited<ReturnType<typeof preview.mutateAsync>> | null>(null);
  const uploadPdf = trpc.admin.contents.uploadPdf.useMutation();
  const confirm = trpc.admin.pdfBatches.confirm.useMutation();
  const savedLinks = trpc.admin.pdfBatches.list.useQuery({ disciplineId: Number(disciplineId) || 1 }, { enabled: Boolean(disciplineId) });
  const move = trpc.admin.pdfBatches.move.useMutation();

  const reset = () => {
    setError(""); setProgress(""); setSuccess("");
    preview.reset(); confirm.reset(); setPlan(null); setNeedsRevalidation(false);
  };
  const selectFiles = (input: FileList | null) => {
    reset();
    const chosen = input ? Array.from(input) : [];
    if (chosen.length > MAX_PDFS) return void setError("Escolha até 100 apostilas por lote.");
    for (const file of chosen) {
      if (!/\.pdf$/i.test(file.name)) return void setError(`${file.name}: somente arquivos PDF são aceitos.`);
      if (!file.size || file.size > MAX_PDF_SIZE) return void setError(`${file.name}: cada PDF precisa ter até 10 MB.`);
    }
    setFiles(chosen);
    setTargetKeys({});
    setChosenContents({});
    setEditingContentsFor(null);
    setContentFilter("");
  };
  const verify = async () => {
    setError(""); setSuccess(""); setProgress("");
    if (!disciplineId || !files.length) return void setError("Selecione a disciplina e as apostilas antes de validar.");
    try {
      const checked = await preview.mutateAsync({
        disciplineId: Number(disciplineId),
        files: files.map(file => ({
          fileName: file.name,
          targetKey: (chosenContents[file.name]?.length ? undefined : targetKeys[file.name]) || undefined,
          targetContentIds: chosenContents[file.name]?.length ? chosenContents[file.name] : undefined,
        })),
        replaceExisting,
      });
      setPlan(checked);
      setNeedsRevalidation(false);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível conferir as apostilas.");
    }
  };
  const associate = async () => {
    const result = plan;
    if (!result || needsRevalidation || !files.length || result.unmatched.length || result.blockedShared.length || !result.totalAssociations || busy) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      // Primeiro envia os PDFs para armazenamento privado. O banco só é alterado
      // após o último envio, em uma única transação de associações.
      const uploaded: { fileName: string; targetKey?: string; targetContentIds?: number[]; expectedContentIds: number[]; url: string }[] = [];
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        setProgress(`Enviando apostila ${i + 1} de ${files.length}: ${file.name}`);
        const base64 = await readPdfAsBase64(file);
        const stored = await uploadPdf.mutateAsync({ fileName: file.name, mimeType: "application/pdf", base64 });
        uploaded.push({
          fileName: file.name,
          targetKey: (chosenContents[file.name]?.length ? undefined : targetKeys[file.name]) || undefined,
          targetContentIds: chosenContents[file.name]?.length ? chosenContents[file.name] : undefined,
          expectedContentIds: result.mappings.find(item => item.fileName === file.name)?.contentIds ?? [],
          url: stored.url,
        });
      }
      setProgress("Associando apostilas às aulas e registrando auditoria...");
      const saved = await confirm.mutateAsync({
        disciplineId: Number(disciplineId), files: uploaded, replaceExisting,
        expectedCount: result.totalAssociations,
      });
      setSuccess(`${saved.uploaded} PDF(s) associado(s) a ${saved.associated} conteúdo(s). Os links de download já estão disponíveis nas respectivas aulas publicadas.`);
      setProgress("");
      await onImported();
      await savedLinks.refetch();
      preview.reset(); setPlan(null); setNeedsRevalidation(false);
      setFiles([]); setTargetKeys({}); setChosenContents({});
      setEditingContentsFor(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha no envio ou na associação das apostilas.");
      setProgress("");
    } finally {
      setBusy(false);
    }
  };

  const result = plan;
  const valid = Boolean(result && !needsRevalidation && !result.unmatched.length && !result.blockedShared.length && result.totalAssociations > 0);
  const correctExisting = async (url: string, contentIds: number[], targetKey: string) => {
    if (!disciplineId || !targetKey || busy) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      const saved = await move.mutateAsync({
        disciplineId: Number(disciplineId), sourceUrl: url, targetKey,
        replaceExisting: allowReplaceTarget, expectedSourceContentIds: contentIds,
      });
      setSuccess("Apostila realocada para " + saved.targetLabel + ". " + saved.updated + " vínculo(s) atualizado(s).");
      await savedLinks.refetch();
      await onImported();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível alterar a associação.");
    } finally {
      setBusy(false);
    }
  };

  return <section className="mt-5 space-y-4 rounded-2xl border border-[#bedbd0] bg-white p-4 sm:p-5" aria-label="Importar apostilas em massa">
    <div className="flex items-start gap-3">
      <FileText className="mt-1 h-6 w-6 shrink-0 text-[#176a5a]" aria-hidden="true"/>
      <div>
        <h4 className="font-display text-lg font-bold text-[#173d4a]">Importar apostilas PDF em massa</h4>
        <p className="mt-1 text-xs leading-5 text-[#52666f]">
          Selecione a disciplina e vários PDFs. Você pode usar <strong> {pdfExample}</strong>
          ou manter o nome original do arquivo. {" "}{mappingHint}
        </p>
      </div>
    </div>
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="block text-xs font-bold text-[#254751]">Disciplina para associar
        <select value={disciplineId} disabled={busy} onChange={event => {setDisciplineId(event.target.value); reset();}} className="filter-control mt-1.5 w-full">
          <option value="">Selecione uma disciplina cadastrada</option>
          {disciplines.map(d => <option key={d.id} value={d.id}>{d.name} ({d.shortName})</option>)}
        </select>
      </label>
      <label className="block text-xs font-bold text-[#254751]">Apostilas PDF (seleção múltipla)
        <input aria-label="Selecionar várias apostilas PDF" type="file" accept=".pdf,application/pdf" multiple disabled={busy}
          onChange={event => selectFiles(event.target.files)} className="mt-1.5 block w-full rounded-lg border border-[#c6d6d1] bg-white p-2 text-xs"/>
      </label>
    </div>
    <label className="flex cursor-pointer items-start gap-2 text-xs leading-5 text-[#315c62]">
      <input type="checkbox" checked={replaceExisting} disabled={busy} onChange={event => {setReplaceExisting(event.target.checked); reset();}} className="mt-1 accent-[#176a5a]"/>
      Substituir PDFs que já estão associados às aulas correspondentes. Desmarcado, preserva as apostilas atuais.
    </label>
    <p className="text-xs text-[#52666f]">{files.length} PDF(s) selecionado(s) · máximo de 100 arquivos por lote, até 10 MB cada.</p>
    <button type="button" onClick={() => void verify()} disabled={busy || preview.isPending || !files.length || !disciplineId}
      className="ghost-button min-h-11 disabled:opacity-50">
      <Upload className="mr-2 inline h-4 w-4" aria-hidden="true"/>Conferir correspondências
    </button>
    {result && <section className="rounded-xl border border-[#c9dfd5] bg-[#f3faf7] p-4" aria-label="Conferência de associação das apostilas">
      <h5 className="flex items-center gap-2 text-sm font-bold text-[#17644e]"><CheckCircle2 className="h-4 w-4"/>Conferir aula de cada apostila antes de enviar</h5>
      <p className="mt-2 text-xs leading-5">Confira a sugestão automática ou escolha uma aula, um conteúdo específico ou vários conteúdos. Clique em <strong>Revalidar alterações</strong> antes de confirmar.</p>
      <p className="mt-2 text-xs leading-5"><strong>{result.totalFiles} apostila(s)</strong> · <strong>{result.totalAssociations} conteúdo(s) para associar</strong> · {result.totalContentsInDiscipline} conteúdo(s) na disciplina.</p>
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="flex-1 text-xs font-semibold text-[#315c62]">Pesquisar apostila
          <input value={mappingSearch} onChange={event => setMappingSearch(event.target.value)}
            placeholder={`Ex.: ${pdfExample}`} className="filter-control mt-1 w-full" />
        </label>
        <label className="flex items-center gap-2 text-xs font-semibold text-[#315c62]">
          <input type="checkbox" checked={onlyPending} onChange={event => setOnlyPending(event.target.checked)} />
          Mostrar apenas sem correspondência
        </label>
      </div>
      <div className="mt-3 max-h-[35rem] overflow-auto rounded-lg border border-[#d0e0da] bg-white">
        <table className="w-full min-w-[660px] border-collapse text-left text-xs">
          <thead className="sticky top-0 z-10 bg-[#e9f4ef] text-[#254751]">
            <tr><th className="p-3">PDF</th><th className="p-3">Aula ou conteúdo de destino</th><th className="p-3">Conteúdos</th><th className="p-3">Situação</th><th className="p-3">Detalhes</th></tr>
          </thead>
          <tbody className="divide-y divide-[#e3ebe7]">
            {result.mappings.filter(entry => entry.fileName.toLocaleLowerCase().includes(mappingSearch.trim().toLocaleLowerCase()) && (!onlyPending || entry.matchedContents === 0)).map(entry =>
              <tr key={entry.fileName} className="align-top hover:bg-[#f9fcfa]">
                <td className="max-w-52 break-all p-3 font-bold text-[#173d4a]">{entry.fileName}</td>
                <td className="p-3">
                  <select aria-label={"Aula ou conteúdo de destino de " + entry.fileName} disabled={busy}
                     value={chosenContents[entry.fileName]?.length ? "" : (targetKeys[entry.fileName] ?? entry.targetKey ?? "")}
                     onChange={event => {
                       setTargetKeys(current => ({ ...current, [entry.fileName]: event.target.value }));
                       setChosenContents(current => ({ ...current, [entry.fileName]: [] }));
                       setNeedsRevalidation(true); setSuccess("");
                     }}
                     className="filter-control w-full min-w-44">
                     <option value="">Escolha um destino</option>
                     <optgroup label="Aulas e grupos">
                       {result.availableTargets.filter(target => target.kind === "group").map(target =>
                         <option value={target.key} key={target.key}>{target.label} — {target.contentCount} conteúdo(s)</option>)}
                     </optgroup>
                     <optgroup label="Conteúdos individuais">
                       {result.availableTargets.filter(target => target.kind === "content").map(target =>
                         <option value={target.key} key={target.key}>{target.label}</option>)}
                     </optgroup>
                   </select>
                   <button type="button" disabled={busy}
                     className="mt-2 text-xs font-semibold text-[#0e5a70] underline"
                     onClick={() => {setEditingContentsFor(current => current === entry.fileName ? null : entry.fileName); setContentFilter("");}}>
                     {editingContentsFor === entry.fileName ? "Fechar seleção múltipla" : "Selecionar vários conteúdos"}
                   </button>
                   {chosenContents[entry.fileName]?.length ? <p className="mt-1 text-xs text-[#17644e]">{chosenContents[entry.fileName].length} conteúdo(s) selecionado(s)</p> : null}
                   {editingContentsFor === entry.fileName && <div className="mt-2 max-w-[28rem] rounded-lg border border-[#bedbd0] bg-[#f9fcfa] p-2">
                     <input value={contentFilter} onChange={event => setContentFilter(event.target.value)}
                       placeholder="Pesquisar conteúdo pelo título" className="filter-control mb-2 w-full" />
                     <div className="max-h-48 space-y-1 overflow-y-auto">
                       {result.availableContents.filter(item =>
                         item.title.toLocaleLowerCase("pt-BR").includes(contentFilter.trim().toLocaleLowerCase("pt-BR"))
                       ).map(item => <label key={item.id} className="flex items-start gap-2 text-[11px]">
                         <input type="checkbox" checked={Boolean(chosenContents[entry.fileName]?.includes(item.id))}
                           onChange={event => {
                             setChosenContents(current => {
                               const before = current[entry.fileName] ?? [];
                               const updated = event.target.checked ? [...before, item.id] : before.filter(id => id !== item.id);
                               return { ...current, [entry.fileName]: updated };
                             });
                             setNeedsRevalidation(true); setSuccess("");
                           }} />
                         <span>#{item.id} — {item.title}{item.hasPdf ? " (já possui PDF)" : ""}</span>
                       </label>)}
                     </div>
                   </div>}
                </td>
                <td className="whitespace-nowrap p-3">{entry.matchedContents} encontrados<br/>{entry.toAssociate} para associar</td>
                <td className="p-3 font-semibold">{entry.matchedContents === 0 ? <span className="text-red-700">{entry.reason ?? "Sem correspondência"}</span> : entry.toAssociate === 0 ? <span className="text-amber-700">Já possui PDF</span> : <span className="text-[#17644e]">{entry.matchMode === "automatic" ? "Sugestão automática" : "Escolha manual"}</span>}</td>
                <td className="p-3">
                  <details><summary className="cursor-pointer font-semibold text-[#0e5a70]">Ver conteúdos</summary>
                    <ul className="mt-2 max-h-40 min-w-64 space-y-1 overflow-y-auto">
                      {entry.contents.map(content => <li key={content.id} className="border-b border-[#edf2ef] py-1">#{content.id} — {content.title} <span className="font-semibold">{content.hasPdf ? (replaceExisting ? "• Será substituído" : "• Já possui PDF") : "• Receberá PDF"}</span></li>)}
                    </ul>
                  </details>
                </td>
              </tr>)}
          </tbody>
        </table>
        {result.mappings.filter(entry => entry.fileName.toLocaleLowerCase().includes(mappingSearch.trim().toLocaleLowerCase()) && (!onlyPending || entry.matchedContents === 0)).length === 0 && <p className="p-4 text-center text-xs text-[#52666f]">Nenhuma apostila corresponde aos filtros.</p>}
      </div>
      {needsRevalidation && <p role="status" className="mt-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs font-bold text-amber-800">A aula de destino foi alterada. Revalide a associação antes de enviar os PDFs.</p>}
      {result.unmatched.length > 0 && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">
         {result.unmatched.length} arquivo(s) sem destino. Selecione a aula ou os conteúdos na tabela e revalide: {result.unmatched.join(", ")}.
       </p>}
       {result.blockedShared.length > 0 && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">
         Os conteúdos #{result.blockedShared.join(", #")} são compartilhados com outra disciplina.
         Separe esses conteúdos ou associe PDFs individualmente para não alterar outra matéria.
       </p>}
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" onClick={() => void verify()} disabled={busy || preview.isPending} className="ghost-button min-h-11 disabled:opacity-50">{needsRevalidation ? "Revalidar alterações" : "Conferir novamente"}</button>
        {valid && <button type="button" disabled={busy} onClick={() => void associate()} className="action-button min-h-11 disabled:opacity-50">
          {busy ? "Processando apostilas..." : `Confirmar: enviar PDFs para ${result.totalAssociations} conteúdo(s)`}
        </button>}
      </div>
    </section>}
    {disciplineId && <section className="rounded-xl border border-[#bedbd0] bg-white p-4" aria-label="Consultar e corrigir apostilas já associadas">
      <h5 className="text-sm font-bold text-[#173d4a]">Apostilas já associadas — verificar e corrigir</h5>
      <p className="mt-1 text-xs leading-5 text-[#52666f]">Veja as aulas que já possuem PDFs. Você pode mover uma apostila para outra aula sem reenviar o arquivo. Nenhuma alteração será feita até clicar em <strong>Salvar nova associação</strong>.</p>
      <label className="mt-3 flex items-start gap-2 text-xs"><input type="checkbox" checked={allowReplaceTarget} disabled={busy} onChange={event => setAllowReplaceTarget(event.target.checked)} className="mt-1"/>
        Permitir substituir o PDF da aula de destino, caso ela já tenha outro.
      </label>
      {savedLinks.isLoading && <p className="mt-3 text-xs">Carregando vínculos atuais...</p>}
      {savedLinks.isError && <p role="alert" className="mt-3 text-xs text-red-700">Erro ao consultar as apostilas cadastradas.</p>}
      {savedLinks.data?.groups.length === 0 && <p className="mt-3 text-xs text-[#667c7b]">Ainda não existem apostilas PDF vinculadas a esta disciplina.</p>}
      <div className="mt-3 max-h-[36rem] space-y-3 overflow-y-auto">
        {savedLinks.data?.groups.map(group => {
          const selected = postTargets[group.url] ?? (group.targetKeys.length === 1 ? group.targetKeys[0] : "");
          return <article key={group.url} className="rounded-lg border border-[#d1e0d9] bg-[#fbfdfa] p-3">
            <p className="break-all text-xs font-bold text-[#173d4a]">{group.label}</p>
            <p className="mt-1 text-xs text-[#52666f]">Aula(s) atual(is): {group.lessons.map((n: number) => String(n).padStart(2, "0")).join(", ") || "Sem identificação"} · {group.contents.length} conteúdo(s)</p>
            <details className="mt-2 text-xs">
              <summary className="cursor-pointer font-semibold text-[#0e5a70]">Ver os conteúdos onde este PDF está disponível</summary>
              <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                {group.contents.map((row: { id: number; title: string }) => <li key={row.id}>#{row.id} — {row.title}</li>)}
              </ul>
            </details>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="min-w-48 flex-1 text-xs font-semibold text-[#315c62]">Mover PDF para
                <select className="filter-control mt-1 w-full" value={selected} disabled={busy} onChange={event => setPostTargets(current => ({ ...current, [group.url]: event.target.value }))}>
                  <option value="">Selecione aula ou conteúdo</option>
                   {savedLinks.data?.availableTargets.map(target => <option key={target.key} value={target.key}>
                     {target.label} — {target.contentCount} conteúdo(s)
                   </option>)}
                </select>
              </label>
              <button type="button" disabled={busy || !selected || (group.targetKeys.length === 1 && selected === group.targetKeys[0])} className="ghost-button min-h-10 disabled:opacity-50"
                onClick={() => void correctExisting(group.url, group.contentIds, selected)}>Salvar nova associação</button>
            </div>
          </article>;
        })}
      </div>
    </section>}
    {progress && <p role="status" aria-live="polite" className="rounded-lg bg-[#eff8f4] p-3 text-xs font-semibold text-[#176a5a]">{progress}</p>}
    {success && <p role="status" className="rounded-lg border border-[#98c5b5] bg-[#e8f7f0] p-3 text-xs font-bold text-[#176a5a]">{success}</p>}
    {error && <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertTriangle className="h-4 w-4 shrink-0"/>{error}</p>}
    <p className="text-[11px] leading-5 text-[#667c7b]">Importe primeiro a planilha de conteúdos e confirme o cadastro da disciplina. Nenhum vínculo será alterado se uma apostila falhar antes da confirmação final.</p>
  </section>;
}
