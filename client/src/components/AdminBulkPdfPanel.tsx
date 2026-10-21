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
  const [replaceExisting, setReplaceExisting] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState("");
  const [success, setSuccess] = useState("");
  const [busy, setBusy] = useState(false);
  const preview = trpc.admin.pdfBatches.preview.useMutation();
  const uploadPdf = trpc.admin.contents.uploadPdf.useMutation();
  const confirm = trpc.admin.pdfBatches.confirm.useMutation();

  const reset = () => {
    setError(""); setProgress(""); setSuccess("");
    preview.reset(); confirm.reset();
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
  };
  const verify = async () => {
    setError(""); setSuccess(""); setProgress("");
    if (!disciplineId || !files.length) return void setError("Selecione a disciplina e as apostilas antes de validar.");
    try {
      await preview.mutateAsync({ disciplineId: Number(disciplineId), fileNames: files.map(file => file.name), replaceExisting });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Não foi possível conferir as apostilas.");
    }
  };
  const associate = async () => {
    const result = preview.data;
    if (!result || !files.length || result.unmatched.length || !result.totalAssociations || busy) return;
    setBusy(true); setError(""); setSuccess("");
    try {
      // Primeiro envia os PDFs para armazenamento privado. O banco só é alterado
      // após o último envio, em uma única transação de associações.
      const uploaded: { fileName: string; url: string }[] = [];
      for (let i = 0; i < files.length; i += 1) {
        const file = files[i];
        setProgress(`Enviando apostila ${i + 1} de ${files.length}: ${file.name}`);
        const base64 = await readPdfAsBase64(file);
        const stored = await uploadPdf.mutateAsync({ fileName: file.name, mimeType: "application/pdf", base64 });
        uploaded.push({ fileName: file.name, url: stored.url });
      }
      setProgress("Associando apostilas às aulas e registrando auditoria...");
      const saved = await confirm.mutateAsync({
        disciplineId: Number(disciplineId), files: uploaded, replaceExisting,
        expectedCount: result.totalAssociations,
      });
      setSuccess(`${saved.uploaded} PDF(s) associado(s) a ${saved.associated} conteúdo(s). Os links de download já estão disponíveis nas respectivas aulas publicadas.`);
      setProgress("");
      await onImported();
      preview.reset();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Falha no envio ou na associação das apostilas.");
      setProgress("");
    } finally {
      setBusy(false);
    }
  };

  const result = preview.data;
  const valid = Boolean(result && !result.unmatched.length && result.totalAssociations > 0);

  return <section className="mt-5 space-y-4 rounded-2xl border border-[#bedbd0] bg-white p-4 sm:p-5" aria-label="Importar apostilas em massa">
    <div className="flex items-start gap-3">
      <FileText className="mt-1 h-6 w-6 shrink-0 text-[#176a5a]" aria-hidden="true"/>
      <div>
        <h4 className="font-display text-lg font-bold text-[#173d4a]">Importar apostilas PDF em massa</h4>
        <p className="mt-1 text-xs leading-5 text-[#52666f]">
          Selecione a disciplina e vários PDFs. O sistema identifica arquivos como
          <strong> PT_Aula_01.pdf</strong>, <strong> PT_Aula_02.pdf</strong> e relaciona cada um
          com os conteúdos cujos títulos começam por Aula 01, Aula 02, etc.
          Funciona com a planilha de 45 aulas e suas 417 divisões.
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
    {result && <div className="rounded-xl border border-[#c9dfd5] bg-[#f3faf7] p-4">
      <h5 className="flex items-center gap-2 text-sm font-bold text-[#17644e]"><CheckCircle2 className="h-4 w-4"/>Prévia de associações — nenhum PDF foi enviado ainda</h5>
      <p className="mt-2 text-xs leading-5">
        <strong>{result.totalFiles} apostila(s)</strong> · <strong>{result.totalAssociations} conteúdo(s) para associar</strong>
        {' '}· {result.totalContentsInDiscipline} conteúdo(s) na disciplina.
      </p>
      <div className="mt-3 max-h-60 overflow-auto rounded-lg bg-white">
        <table className="w-full text-left text-xs"><thead className="sticky top-0 bg-[#e4f1eb]"><tr>
          <th className="p-2">PDF</th><th className="p-2">Aula</th><th className="p-2">Conteúdos</th><th className="p-2">Serão associados</th>
        </tr></thead><tbody>{result.mappings.map(entry => <tr key={entry.fileName} className="border-t border-[#e6ece9]">
          <td className="break-all p-2">{entry.fileName}</td><td className="p-2">{String(entry.lesson).padStart(2, "0")}</td>
          <td className="p-2">{entry.matchedContents}</td><td className="p-2">{entry.toAssociate}</td>
        </tr>)}</tbody></table>
      </div>
      {result.unmatched.length > 0 && <p role="alert" className="mt-2 text-xs font-semibold text-red-700">Sem correspondência na disciplina: {result.unmatched.join(", ")}. Importe primeiro os conteúdos e confira o nome dos arquivos.</p>}
      {valid && <button type="button" disabled={busy} onClick={() => void associate()} className="action-button mt-4 min-h-11 disabled:opacity-50">
        {busy ? "Processando apostilas..." : `Enviar ${result.totalFiles} PDF(s) e associar ${result.totalAssociations} conteúdo(s)`}
      </button>}
    </div>}
    {progress && <p role="status" aria-live="polite" className="rounded-lg bg-[#eff8f4] p-3 text-xs font-semibold text-[#176a5a]">{progress}</p>}
    {success && <p role="status" className="rounded-lg border border-[#98c5b5] bg-[#e8f7f0] p-3 text-xs font-bold text-[#176a5a]">{success}</p>}
    {error && <p role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700"><AlertTriangle className="h-4 w-4 shrink-0"/>{error}</p>}
    <p className="text-[11px] leading-5 text-[#667c7b]">Importe primeiro a planilha de conteúdos e confirme o cadastro da disciplina. Nenhum vínculo será alterado se uma apostila falhar antes da confirmação final.</p>
  </section>;
}
