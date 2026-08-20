import { describe, expect, it } from "vitest";

describe("credencial protegida do Resend", () => {
  it("autentica na rota de envio sem expor a chave nem disparar e-mail", async () => {
    const apiKey = process.env.RESEND_API_KEY;

    expect(apiKey).toBeTruthy();

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      // Corpo propositalmente incompleto: o Resend deve barrá-lo por validação
      // após autenticar a chave, sem criar ou entregar e-mail algum.
      body: JSON.stringify({}),
    });

    // 401 indica que a chave é ausente, inválida ou revogada. Uma chave válida
    // com "Sending access" alcança a validação do corpo e retorna outro status.
    expect(response.status).not.toBe(401);
  });
});
