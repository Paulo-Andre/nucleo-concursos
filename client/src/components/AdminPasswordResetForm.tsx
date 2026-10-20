import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";

export function validateManagedPasswordReset(password: string, confirmation: string): string | null {
  if (password.length < 8) return "A nova senha precisa ter pelo menos 8 caracteres.";
  if (password.length > 128) return "A nova senha deve ter no máximo 128 caracteres.";
  if (password !== confirmation) return "As senhas não conferem. Digite a mesma senha nos dois campos.";
  return null;
}

type Props = {
  userName: string;
  pending: boolean;
  onReset: (newPassword: string, confirmation: string) => Promise<unknown>;
};

export function AdminPasswordResetForm({ userName, pending, onReset }: Props) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(null);
  const busy = pending || submitting;

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    const validationError = validateManagedPasswordReset(password, confirmation);
    if (validationError) {
      setFeedback({ kind: "error", message: validationError });
      return;
    }
    setSubmitting(true);
    setFeedback(null);
    try {
      await onReset(password, confirmation);
      setPassword("");
      setConfirmation("");
      setFeedback({ kind: "success", message: `Senha de ${userName} redefinida com sucesso. As sessões anteriores dessa conta foram encerradas; o usuário precisa entrar novamente com a nova senha.` });
    } catch (error) {
      setFeedback({ kind: "error", message: error instanceof Error ? error.message : "Não foi possível redefinir a senha. Tente novamente." });
    } finally {
      setSubmitting(false);
    }
  };

  const onEdit = () => setFeedback(null);

  return (
    <form onSubmit={event => void submit(event)} autoComplete="off" className="border-t border-[#d8d0c4] pt-4">
      <h4 className="text-xs font-bold">Redefinir senha</h4>
      <p className="mt-1 text-xs leading-5 text-[#60747a]">Conta selecionada: <strong>{userName}</strong>. A senha antiga não será exibida.</p>
      <label className="mt-3 block text-sm font-semibold">
        Nova senha (mínimo de 8 caracteres)
        <Input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={password} onChange={event => { setPassword(event.target.value); onEdit(); }} className="mt-1.5 h-11 border-[#cec6b8] bg-white"/>
      </label>
      <label className="mt-3 block text-sm font-semibold">
        Confirmar nova senha
        <Input type="password" autoComplete="new-password" minLength={8} maxLength={128} value={confirmation} onChange={event => { setConfirmation(event.target.value); onEdit(); }} className="mt-1.5 h-11 border-[#cec6b8] bg-white"/>
      </label>
      <button type="submit" disabled={busy || !password || !confirmation} className="ghost-button mt-2 w-full border-[#cfb47e] text-[#8c5b23] disabled:cursor-not-allowed disabled:opacity-50">
        {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <KeyRound className="h-3.5 w-3.5" />}
        {busy ? "Redefinindo senha..." : "Redefinir senha"}
      </button>
      {feedback && <p role={feedback.kind === "error" ? "alert" : "status"} aria-live={feedback.kind === "error" ? "assertive" : "polite"} className={`mt-3 rounded-lg border px-3 py-3 text-xs font-semibold leading-5 ${feedback.kind === "error" ? "border-[#d7a8a0] bg-[#fff5f2] text-[#953e38]" : "border-[#b9d6cb] bg-[#edf8f4] text-[#17644e]"}`}>{feedback.message}</p>}
    </form>
  );
}
