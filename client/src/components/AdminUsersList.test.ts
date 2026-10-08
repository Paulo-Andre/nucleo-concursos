import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminUsersList, type ManagedUserRow } from "./AdminUsersList";

const user: ManagedUserRow = { id: 1, name: "Aluno Teste", username: "aluno-teste", email: "teste@example.invalid", role: "user", isBlocked: false, lastSignedIn: null };
const handlers = { search: "", onChoose: vi.fn(), onClearSearch: vi.fn(), onRetry: vi.fn() };

describe("lista administrativa de usuários", () => {
  it("inclui cartões para celular e tabela semântica para telas grandes", () => {
    const html = renderToStaticMarkup(createElement(AdminUsersList, { ...handlers, users: [user], isLoading: false, isError: false }));
    expect(html).toContain("md:hidden");
    expect(html).toContain("md:block");
    expect(html).toContain("<caption");
    expect(html).toContain("Gerenciar conta");
    expect(html).toContain("Ativa");
  });
  it("diferencia erro real de lista vazia", () => {
    const errorHtml = renderToStaticMarkup(createElement(AdminUsersList, { ...handlers, users: [], isLoading: false, isError: true }));
    const emptyHtml = renderToStaticMarkup(createElement(AdminUsersList, { ...handlers, users: [], isLoading: false, isError: false }));
    expect(errorHtml).toContain('role="alert"');
    expect(errorHtml).toContain("Tentar novamente");
    expect(emptyHtml).toContain("Nenhum usuário encontrado");
  });
});
