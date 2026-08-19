import { useState } from "react";
import { Loader2, LockKeyhole, ShieldCheck, UserPlus } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type AccessGateProps = { onAuthenticated: () => void };

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

export default function AccessGate({ onAuthenticated }: AccessGateProps) {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", username: "", email: "", cpf: "", identifier: "", password: "", confirmation: "" });
  const utils = trpc.useUtils();
  const login = trpc.auth.login.useMutation({ onSuccess: async user => { utils.auth.me.setData(undefined, user); await utils.auth.me.invalidate(); onAuthenticated(); } });
  const register = trpc.auth.register.useMutation({ onSuccess: async user => { utils.auth.me.setData(undefined, user); await utils.auth.me.invalidate(); onAuthenticated(); } });
  const pending = login.isPending || register.isPending;

  function update(field: keyof typeof form, value: string) { setForm(current => ({ ...current, [field]: value })); }
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setMessage(null);
    try {
      if (mode === "login") await login.mutateAsync({ identifier: form.identifier, password: form.password });
      else {
        if (!hasValidCpfDigits(form.cpf)) { setMessage("Informe um CPF válido."); return; }
        await register.mutateAsync({ name: form.name, username: form.username, email: form.email, cpf: form.cpf, password: form.password, passwordConfirmation: form.confirmation });
      }
    } catch (error: any) {
      setMessage(error?.message || "Não foi possível concluir a operação.");
    }
  }

  return <main className="min-h-screen bg-[#f5f1e8] px-4 py-8 text-[#152d38] sm:grid sm:place-items-center">
    <section className="grid w-full max-w-5xl overflow-hidden border border-[#cfc8b8] bg-[#fffdf7] shadow-[0_22px_70px_rgba(21,45,56,0.16)] md:grid-cols-[0.92fr_1.08fr]">
      <div className="bg-[#152d38] p-8 text-[#fffdf7] sm:p-12">
        <div className="mb-16 flex items-center gap-3"><div className="grid h-11 w-11 place-items-center rounded-xl bg-[#e8e4d9] text-[#0e5a70]"><ShieldCheck className="h-6 w-6" /></div><div><p className="font-display text-lg font-extrabold">ESTUDOS <span className="text-[#82cfbf]">PF</span></p><p className="text-[9px] font-bold tracking-[0.22em] text-[#8fa7ae]">ARQUIVO OPERACIONAL</p></div></div>
        <p className="text-[10px] font-bold tracking-[0.2em] text-[#8ad2c3]">ACESSO INDIVIDUAL · PRIVADO</p>
        <h1 className="font-display mt-4 text-4xl font-extrabold leading-[1.04] sm:text-5xl">Seu preparo fica sob sua própria guarda.</h1>
        <p className="mt-6 max-w-sm text-sm leading-7 text-[#c7d8d8]">Entre para registrar seu progresso, suas respostas, simulados, notas e evolução. Seus dados de estudo não são compartilhados com outros candidatos.</p>
        <div className="mt-12 border-t border-white/15 pt-5 text-xs text-[#a8c1c3]"><LockKeyhole className="mr-2 inline h-4 w-4 text-[#82cfbf]" />Sessão segura e dados vinculados à sua conta.</div>
      </div>
      <div className="p-7 sm:p-12">
        <div className="flex border-b border-[#d8d0c1] text-sm font-bold"><button className={`-mb-px border-b-2 px-1 pb-3 ${mode === "login" ? "border-[#0e5a70] text-[#0e5a70]" : "border-transparent text-[#7b8582]"}`} onClick={() => { setMode("login"); setMessage(null); }}>Entrar</button><button className={`-mb-px ml-7 border-b-2 px-1 pb-3 ${mode === "register" ? "border-[#0e5a70] text-[#0e5a70]" : "border-transparent text-[#7b8582]"}`} onClick={() => { setMode("register"); setMessage(null); }}><UserPlus className="mr-1.5 inline h-4 w-4" />Criar conta</button></div>
        <div className="mt-8"><p className="text-[10px] font-bold tracking-[0.18em] text-[#5d777d]">{mode === "login" ? "IDENTIFIQUE-SE" : "NOVA CREDENCIAL"}</p><h2 className="font-display mt-2 text-3xl font-extrabold">{mode === "login" ? "Acesse seu dossiê." : "Comece seu registro."}</h2></div>
        <form onSubmit={submit} className="mt-7 space-y-4">
          {mode === "register" && <><label className="block text-xs font-bold">Nome completo<Input value={form.name} onChange={event => update("name", event.target.value)} autoComplete="name" className="mt-1.5 h-11 border-[#cfc8b8] bg-white" required /></label><label className="block text-xs font-bold">Nome de usuário<Input value={form.username} onChange={event => update("username", event.target.value.toLowerCase())} autoComplete="username" className="mt-1.5 h-11 border-[#cfc8b8] bg-white" required /></label><label className="block text-xs font-bold">E-mail<Input type="email" value={form.email} onChange={event => update("email", event.target.value)} autoComplete="email" className="mt-1.5 h-11 border-[#cfc8b8] bg-white" required /></label><label className="block text-xs font-bold">CPF<Input value={form.cpf} onChange={event => update("cpf", formatCpfInput(event.target.value))} inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" className="mt-1.5 h-11 border-[#cfc8b8] bg-white" aria-describedby="cpf-help" required /></label><p id="cpf-help" className="-mt-2 text-[11px] leading-4 text-[#6f7775]">Usamos somente números e confirmamos os dígitos verificadores.</p></>}
          {mode === "login" && <label className="block text-xs font-bold">Usuário ou e-mail<Input value={form.identifier} onChange={event => update("identifier", event.target.value)} autoComplete="username" className="mt-1.5 h-11 border-[#cfc8b8] bg-white" required /></label>}
          <label className="block text-xs font-bold">Senha<Input type="password" value={form.password} onChange={event => update("password", event.target.value)} autoComplete={mode === "login" ? "current-password" : "new-password"} className="mt-1.5 h-11 border-[#cfc8b8] bg-white" required /></label>
          {mode === "register" && <label className="block text-xs font-bold">Confirme a senha<Input type="password" value={form.confirmation} onChange={event => update("confirmation", event.target.value)} autoComplete="new-password" className="mt-1.5 h-11 border-[#cfc8b8] bg-white" required /></label>}
          {message && <p role="alert" className="border border-[#b7503a]/40 bg-[#fff2ee] px-3 py-2 text-xs font-medium text-[#8f311f]">{message}</p>}
          <Button type="submit" disabled={pending} className="mt-2 h-11 w-full bg-[#0e5a70] font-bold text-white hover:bg-[#09495b]">{pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{mode === "login" ? "Entrar na plataforma" : "Criar conta e entrar"}</Button>
        </form>
        <p className="mt-6 text-xs leading-5 text-[#6f7775]">A recuperação por e-mail poderá ser ativada quando houver um serviço de correio transacional configurado. Por enquanto, a senha pode ser alterada no perfil ou redefinida pelo administrador.</p>
      </div>
    </section>
  </main>;
}
