import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { AdminPasswordResetForm, validateManagedPasswordReset } from "./AdminPasswordResetForm";

describe("redefinição administrativa de senha", () => {
  it("valida comprimento mínimo, máximo e confirmação", () => {
    expect(validateManagedPasswordReset("curta", "curta")).toMatch(/8 caracteres/);
    expect(validateManagedPasswordReset("a".repeat(129), "a".repeat(129))).toMatch(/128 caracteres/);
    expect(validateManagedPasswordReset("SenhaSegura123", "OutraSenha456")).toMatch(/não conferem/);
    expect(validateManagedPasswordReset("SenhaSegura123", "SenhaSegura123")).toBeNull();
  });

  it("apresenta formulário sem expor senhas e com aviso junto do botão", () => {
    const html = renderToStaticMarkup(createElement(AdminPasswordResetForm, {
      userName: "Aluno de exemplo",
      pending: false,
      onReset: vi.fn(),
    }));
    expect(html).toContain("Conta selecionada:");
    expect(html).toContain("Aluno de exemplo");
    expect(html).toContain("Nova senha");
    expect(html).toContain('type="password"');
    expect(html).toContain('autoComplete="new-password"');
    expect(html).toContain('type="submit"');
    expect(html).toContain("Redefinir senha");
    expect(html).not.toContain("SenhaSegura123");
  });
});
