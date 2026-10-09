import { useState } from "react";
import { ArrowLeft, Home, KeyRound, Loader2, LockKeyhole, Mail, ShieldCheck, UserPlus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { GlobalContactLinks } from "@/components/GlobalContactLinks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AccessMode = "login" | "register" | "forgot" | "reset";
type AccessGateProps = { onAuthenticated: (hadActiveSession: boolean) => void; initialMode?: AccessMode; onBackToStorefront?: () => void; onGoHome?: () => void; onViewPackages?: () => void; selectedPlanPending?: boolean };

function formatCpfInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function hasValidCpfDigits(value: string) {
  const cpf = value.replace(/\D/g, "");
  if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
  const digit = (length: number) => {
    const sum = cpf.slice(0, length).split("").reduce((total, item, index) => total + Number(item) * (length + 1 - index), 0);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10]);
}

export default function AccessGate({ onAuthenticated, initialMode = "login", onBackToStorefront, onGoHome, onViewPackages, selectedPlanPending = false }: AccessGateProps) {
  const [mode, setMode] = useState<AccessMode>(initialMode);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error" | null>(null);
  const [form, setForm] = useState({ name: "", username: "", email: "", cpf: "", identifier: "", password: "", confirmation: "", resetPassword: "", resetConfirmation: "" });
  const [resetToken] = useState(() => new URLSearchParams(window.location.search).get("reset") ?? "");
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation({ onSuccess: async result => { utils.auth.me.setData(undefined, result.user); await utils.auth.me.invalidate(); onAuthenticated(result.hadActiveSession); } });
  const register = trpc.auth.register.useMutation({ onSuccess: async result => { utils.auth.me.setData(undefined, result.user); await utils.auth.me.invalidate(); onAuthenticated(result.hadActiveSession); } });
  const requestReset = trpc.auth.requestPasswordReset.useMutation();
  const resetPassword = trpc.auth.resetPassword.useMutation();
  const pending = login.isPending || register.isPending || requestReset.isPending || resetPassword.isPending;

  function update(field: keyof typeof form, value: string) { setForm(current => ({ ...current, [field]: value })); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    setMessageTone(null);
    try {
      if (mode === "login") await login.mutateAsync({ identifier: form.identifier, password: form.password });
      else if (mode === "register") {
        if (!hasValidCpfDigits(form.cpf)) { setMessageTone("error"); setMessage("Informe um CPF válido."); return; }
        await register.mutateAsync({ name: form.name, username: form.username, email: form.email, cpf: form.cpf, password: form.password, passwordConfirmation: form.confirmation });
      } else if (mode === "forgot") {
        await requestReset.mutateAsync({ email: form.email });
        setMessageTone("success");
        setMessage("Se este e-mail estiver cadastrado, enviaremos um link de recuperação. Verifique também a caixa de spam.");
      } else {
        if (!resetToken) { setMessageTone("error"); setMessage("Este link de redefinição está incompleto. Solicite um novo e-mail."); return; }
        await resetPassword.mutateAsync({ token: resetToken, newPassword: form.resetPassword, confirmation: form.resetConfirmation });
        setMessageTone("success");
        setMessage("Senha redefinida. Você já pode entrar com a nova senha.");
        window.history.replaceState({}, "", window.location.pathname);
        setMode("login");
      }
    } catch (error: any) {
      setMessageTone("error");
      setMessage(error?.message || "Não foi possível concluir a operação.");
    }
  }

  return <main className="min-h-screen bg-[#f5f1e8] px-3 py-0 text-[#152d38] sm:grid sm:place-items-center sm:px-4 sm:py-8">
    <section className="grid w-full max-w-5xl overflow-hidden border border-[#cfc8b8] bg-[#fffdf7] shadow-[0_22px_70px_rgba(21,45,56,0.16)] md:grid-cols-[0.92fr_1.08fr]">
      <div className="min-w-0 bg-[#152d38] p-6 text-[#fffdf7] sm:p-12">
        <div className="mb-10 flex min-w-0 items-center gap-3 sm:mb-16"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-[#e8e4d9] text-[#0e5a70]"><ShieldCheck className="h-6 w-6" /></div><div className="min-w-0"><p className="font-display text-lg font-extrabold">NÚCLEO <span className="text-[#82cfbf]">CONCURSOS</span></p><p className="text-[9px] font-bold tracking-[0.15em] text-[#8fa7ae] sm:tracking-[0.22em]">PREPARO MULTIDISCIPLINAR</p></div></div>
        <p className="text-[10px] font-bold tracking-[0.2em] text-[#8ad2c3]">ACESSO INDIVIDUAL · PRIVADO</p>
        <h1 className="font-display mt-4 break-words text-[clamp(2rem,9vw,2.5rem)] font-extrabold leading-[1.08] sm:text-5xl">Seu estudo começa aqui.</h1>
        <p className="mt-6 max-w-sm text-sm leading-7 text-[#c7d8d8]">Acesse seus cursos e acompanhe suas atividades e seu progresso em um só lugar.</p>
        <div className="mt-9 border-t border-white/15 pt-5 text-xs leading-5 text-[#a8c1c3] sm:mt-12"><LockKeyhole className="mr-2 inline h-4 w-4 text-[#82cfbf]" />Sessão segura e dados vinculados à sua conta.</div>
        <GlobalContactLinks variant="login" />
      </div>
      <div className="min-w-0 p-5 sm:p-12">
        {(onGoHome || onViewPackages || onBackToStorefront) && <div className="mb-6 flex flex-wrap gap-2">
          <button type="button" onClick={onGoHome ?? onBackToStorefront} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[#cfc8b8] bg-white px-3 text-xs font-bold text-[#0e5a70] transition hover:border-[#0e5a70] hover:bg-[#f5faf8]"><Home className="h-3.5 w-3.5" />Página inicial</button>
          <button type="button" onClick={onViewPackages ?? onBackToStorefront} className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-[#cfc8b8] bg-white px-3 text-xs font-bold text-[#0e5a70] transition hover:border-[#0e5a70] hover:bg-[#f5faf8]"><ArrowLeft className="h-3.5 w-3.5" />Ver pacotes</button>
        </div>}
        {selectedPlanPending && <p className="mb-5 rounded-xl border border-[#a9d0c5] bg-[#edf7f5] px-3 py-2 text-xs font-semibold leading-5 text-[#17644e]">Você selecionou um pacote. Entre ou crie sua conta para continuar a compra.</p>}
        {(mode === "login" || mode === "register") ? <div className="flex flex-wrap gap-x-7 border-b border-[#d8d0c1] text-sm font-bold"><button type="button" aria-pressed={mode === "login"} className={`-mb-px min-h-11 border-b-2 px-1 pb-3 ${mode === "login" ? "border-[#0e5a70] text-[#0e5a70]" : "border-transparent text-[#7b8582]"}`} onClick={() => { setMode("login"); setMessage(null); }}>Entrar</button><button type="button" aria-pressed={mode === "register"} className={`-mb-px min-h-11 border-b-2 px-1 pb-3 ${mode === "register" ? "border-[#0e5a70] text-[#0e5a70]" : "border-transparent text-[#7b8582]"}`} onClick={() => { setMode("register"); setMessage(null); }}><UserPlus className="mr-1.5 inline h-4 w-4" />Criar conta</button></div> : <button type="button" className="inline-flex items-center gap-1 border-b border-[#d8d0c1] pb-3 text-xs font-bold text-[#0e5a70] hover:underline" onClick={() => { window.history.replaceState({}, "", window.location.pathname); setMode("login"); setMessage(null); }}><ArrowLeft className="h-4 w-4" />Voltar para entrar</button>}
        <div className="mt-7"><p className="text-[10px] font-bold tracking-[0.14em] text-[#5d777d] sm:tracking-[0.18em]">{mode === "login" ? "IDENTIFIQUE-SE" : mode === "register" ? "NOVA CREDENCIAL" : mode === "forgot" ? "RECUPERAÇÃO SEGURA" : "NOVA SENHA"}</p><h2 className="font-display mt-2 break-words text-2xl font-extrabold sm:text-3xl">{mode === "login" ? "Entre na sua conta." : mode === "register" ? "Crie sua conta." : mode === "forgot" ? "Recupere sua senha." : "Defina uma nova senha."}</h2></div>
        <form onSubmit={submit} aria-busy={pending} className="mt-7 space-y-4">
          {mode === "register" && <><label className="block text-sm font-bold">Nome completo<Input value={form.name} onChange={event => update("name", event.target.value)} autoComplete="name" className="mt-1.5 h-11 border-[#cfc8b8] bg-white" required /></label><label className="block text-sm font-bold">Nome de usuário<Input value={form.username} onChange={event => update("username", event.target.value.toLowerCase())} autoComplete="username" className="mt-1.5 h-11 border-[#cfc8b8] bg-white" required /></label><label className="block text-sm font-bold">E-mail<Input type="email" value={form.email} onChange={event => update("email", event.target.value)} autoComplete="email" className="mt-1.5 h-11 border-[#cfc8b8] bg-white" required /></label><label className="block text-sm font-bold">CPF<Input value={form.cpf} onChange={event => update("cpf", formatCpfInput(event.target.value))} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" className="mt-1.5 h-11 border-[#cfc8b8] bg-white" aria-describedby="cpf-help" required /></label><p id="cpf-help" className="-mt-2 text-[11px] leading-4 text-[#6f7775]">Usamos somente números e confirmamos os dígitos verificadores.</p></>}
          {mode === "login" && <><label className="block text-sm font-bold">Usuário ou e-mail<Input value={form.identifier} onChange={event => update("identifier", event.target.value)} autoComplete="username" className="mt-1.5 h-11 border-[#cfc8b8] bg-white" required /></label><label className="block text-sm font-bold">Senha<Input type="password" value={form.password} onChange={event => update("password", event.target.value)} autoComplete="current-password" className="mt-1.5 h-11 border-[#cfc8b8] bg-white" required /></label><button type="button" onClick={() => { setMode("forgot"); setMessage(null); }} className="-mt-1 text-xs font-bold text-[#0e5a70] hover:underline">Esqueci minha senha</button></>}
          {mode === "register" && <><label className="block text-sm font-bold">Senha<Input type="password" value={form.password} onChange={event => update("password", event.target.value)} autoComplete="new-password" className="mt-1.5 h-11 border-[#cfc8b8] bg-white" required /></label><label className="block text-sm font-bold">Confirme a senha<Input type="password" value={form.confirmation} onChange={event => update("confirmation", event.target.value)} autoComplete="new-password" className="mt-1.5 h-11 border-[#cfc8b8] bg-white" required /></label></>}
          {mode === "forgot" && <label className="block text-sm font-bold">E-mail cadastrado<Input type="email" value={form.email} onChange={event => update("email", event.target.value)} autoComplete="email" className="mt-1.5 h-11 border-[#cfc8b8] bg-white" required /></label>}
          {mode === "reset" && <><p className="rounded-xl border border-[#b9d6cb] bg-[#edf8f4] px-3 py-2 text-xs leading-5 text-[#17644e]"><KeyRound className="mr-1 inline h-4 w-4" />Use uma senha de pelo menos 8 caracteres. Ao confirmar, seus acessos ativos serão encerrados por segurança.</p><label className="block text-sm font-bold">Nova senha<Input type="password" value={form.resetPassword} onChange={event => update("resetPassword", event.target.value)} autoComplete="new-password" className="mt-1.5 h-11 border-[#cfc8b8] bg-white" required /></label><label className="block text-sm font-bold">Confirme a nova senha<Input type="password" value={form.resetConfirmation} onChange={event => update("resetConfirmation", event.target.value)} autoComplete="new-password" className="mt-1.5 h-11 border-[#cfc8b8] bg-white" required /></label></>}
          {message && <p role={messageTone === "error" ? "alert" : "status"} className={`rounded-lg border px-4 py-3 text-sm font-medium leading-6 ${messageTone === "error" ? "border-[#b7503a]/40 bg-[#fff2ee] text-[#8f311f]" : "border-[#a8d8c0] bg-[#e7f6ed] text-[#17644e]"}`}>{message}</p>}
          <Button type="submit" disabled={pending} className="mt-2 h-11 w-full bg-[#0e5a70] font-bold text-white hover:bg-[#09495b]">{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{mode === "login" ? "Entrar na plataforma" : mode === "register" ? "Criar conta e entrar" : mode === "forgot" ? <><Mail className="mr-2 h-4 w-4" />Enviar link de recuperação</> : "Salvar nova senha"}</Button>
        </form>
        <p className="mt-6 text-xs leading-5 text-[#6f7775]">Para proteger sua conta, os links de recuperação são individuais, expiram em uma hora e não revelam se um e-mail está cadastrado.</p>
      </div>
    </section>
  </main>;
}
