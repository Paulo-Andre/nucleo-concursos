import { describe, expect, it } from "vitest";

describe("credencial protegida do Resend", () => {
  it.skipIf(!process.env.RESEND_API_KEY)("está configurada no formato esperado sem expor a chave", () => {
    const apiKey = process.env.RESEND_API_KEY;

    expect(apiKey).toBeTruthy();
    expect(apiKey).toMatch(/^re_[A-Za-z0-9_-]+$/);
  });
});
