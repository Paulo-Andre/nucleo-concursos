import { Loader2 } from "lucide-react";

export type ManagedUserRow = {
  id: number;
  name: string;
  username: string | null;
  email: string | null;
  role: "user" | "admin";
  isBlocked: boolean;
  lastSignedIn: Date | string | null;
};

type Props<T extends ManagedUserRow> = {
  users: T[];
  isLoading: boolean;
  isError: boolean;
  search: string;
  selectedUserId?: number;
  onChoose: (user: T) => void;
  onClearSearch: () => void;
  onRetry: () => void;
};

const displayDate = (value: Date | string | null) => value ? new Date(value).toLocaleString("pt-BR") : "—";

export function AdminUsersList<T extends ManagedUserRow>({ users, isLoading, isError, search, selectedUserId, onChoose, onClearSearch, onRetry }: Props<T>) {
  if (isLoading) return <div role="status" className="mt-4 flex min-h-28 items-center justify-center gap-2 rounded-xl border border-[#d8d0c4] bg-white p-5 text-sm font-semibold text-[#52716f]"><Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />Carregando usuários...</div>;
  if (isError) return <div role="alert" className="mt-4 rounded-xl border border-[#d7a8a0] bg-[#fff5f2] p-5 text-sm text-[#953e38]">Não foi possível carregar os usuários. <button type="button" onClick={onRetry} className="ml-2 min-h-11 font-bold underline">Tentar novamente</button></div>;
  if (!users.length) return <div className="mt-4 rounded-xl border border-dashed border-[#b9b0a2] bg-white p-6 text-center"><p className="text-sm font-semibold text-[#315a5d]">Nenhum usuário encontrado.</p><p className="mt-2 text-sm text-[#647579]">Experimente outro nome ou e-mail.</p>{search && <button type="button" onClick={onClearSearch} className="ghost-button mt-3">Limpar pesquisa</button>}</div>;
  const statusClass = (user: ManagedUserRow) => user.isBlocked ? "border-[#dcad9b] bg-[#fff0eb] text-[#9b4228]" : "border-[#a8d0c4] bg-[#ebf7f3] text-[#176a5a]";
  const statusText = (user: ManagedUserRow) => user.isBlocked ? "Bloqueada" : "Ativa";

  return <>
    <p className="mt-3 text-sm text-[#52716f]" role="status" aria-live="polite">{users.length} usuário{users.length === 1 ? "" : "s"} encontrado{users.length === 1 ? "" : "s"}</p>
    <div className="mt-4 grid gap-3 md:hidden">
      {users.map(user => <article key={user.id} className={`rounded-xl border bg-white p-4 ${selectedUserId === user.id ? "border-[#0e5a70]" : "border-[#d8d0c4]"}`}>
        <div className="flex flex-wrap items-start justify-between gap-2"><div className="min-w-0"><h4 className="break-words text-base font-bold text-[#173d4a]">{user.name}</h4><p className="mt-1 text-sm text-[#52716f]">@{user.username ?? "sem usuário"}{user.role === "admin" && " · Administrador"}</p></div><span className={`rounded-full border px-2 py-1 text-xs font-bold ${statusClass(user)}`}>{statusText(user)}</span></div>
        <p className="mt-3 break-words text-sm text-[#52716f]">{user.email ?? "Sem e-mail cadastrado"}</p>
        <p className="mt-1 text-xs text-[#647579]">Último acesso: {displayDate(user.lastSignedIn)}</p>
        <button type="button" onClick={() => onChoose(user)} className="ghost-button mt-3 w-full">Gerenciar conta</button>
      </article>)}
    </div>
    <div className="mt-4 hidden overflow-x-auto rounded-xl border border-[#d8d0c4] md:block">
      <table className="w-full min-w-[650px] text-left text-sm">
        <caption className="sr-only">Contas registradas, situação e opções de gestão</caption>
        <thead className="bg-[#f3efe6] text-xs font-bold text-[#5d7379]"><tr><th scope="col" className="px-4 py-3">Usuário</th><th scope="col" className="px-4 py-3">Contato</th><th scope="col" className="px-4 py-3">Situação</th><th scope="col" className="px-4 py-3">Último acesso</th><th scope="col" className="px-4 py-3">Ações</th></tr></thead>
        <tbody>{users.map(user => <tr key={user.id} className="border-t border-[#e6ded2]">
          <td className="px-4 py-3"><p className="font-bold text-[#1d3e49]">{user.name}</p><p className="mt-1 text-xs text-[#698087]">@{user.username ?? "sem usuário"}{user.role === "admin" && " · Administrador"}</p></td>
          <td className="break-words px-4 py-3 text-[#547078]">{user.email ?? "—"}</td>
          <td className="px-4 py-3"><span className={`rounded-full border px-2 py-1 text-xs font-bold ${statusClass(user)}`}>{statusText(user)}</span></td>
          <td className="px-4 py-3 text-xs text-[#547078]">{displayDate(user.lastSignedIn)}</td>
          <td className="px-4 py-3"><button type="button" onClick={() => onChoose(user)} className="inline-flex min-h-11 items-center rounded-lg px-2 text-sm font-bold text-[#0e5a70] hover:bg-[#edf7f5]">Gerenciar</button></td>
        </tr>)}</tbody>
      </table>
    </div>
  </>;
}
