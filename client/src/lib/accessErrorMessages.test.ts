import { describe, expect, it } from "vitest";
import { formatAccessError } from "./accessErrorMessages";

describe("mensagens de autenticação amigáveis", () => {
  it("traduz erros Zod serializados em vez de exibir JSON", () => {
    const error = {
      message: JSON.stringify([{ origin: "string", code: "too_small", minimum: 8, inclusive: true, path: ["password"], message: "A senha deve ter pelo menos 8 caracteres." }]),
    };
    expect(formatAccessError(error, "login")).toBe("Usuário ou senha incorretos. Verifique os dados e tente novamente.");
    expect(formatAccessError(error, "register")).toBe("A senha deve ter pelo menos 8 caracteres.");
  });

  it("não expõe regras de comprimento no login, inclusive em validações tRPC", () => {
    expect(formatAccessError({ data: { zodError: { fieldErrors: { password: ["A senha deve ter pelo menos 8 caracteres."] } } } }, "login"))
      .toBe("Usuário ou senha incorretos. Verifique os dados e tente novamente.");
  });

  it("interpreta erros estruturados do tRPC", () => {
    const error = { data: { zodError: { fieldErrors: { email: ["Invalid email address"] } } } };
    expect(formatAccessError(error, "forgot")).toBe("Informe um endereço de e-mail válido.");
  });

  it("preserva mensagens seguras para credenciais e bloqueio", () => {
    expect(formatAccessError({ data: { code: "UNAUTHORIZED" }, message: "UNAUTHORIZED" }, "login"))
      .toContain("Usuário ou senha incorretos");
    expect(formatAccessError({ message: "Esta conta está bloqueada. Procure a administração." }, "login"))
      .toContain("conta está bloqueada");
    expect(formatAccessError({ message: "A confirmação de senha não confere." }, "register"))
      .toBe("As senhas informadas não coincidem.");
  });

  it("nunca repassa mensagens técnicas ou informações privadas do backend", () => {
    expect(formatAccessError({ message: "SQL syntax error near password_hash in database..." }, "login"))
      .toBe("Não foi possível entrar. Verifique sua conexão e tente novamente.");
    expect(formatAccessError({ message: '[{malformed' }, "register"))
      .toBe("Não foi possível criar a conta. Confira os dados e tente novamente.");
  });
});
