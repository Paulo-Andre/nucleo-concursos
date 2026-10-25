import { beforeEach, describe, expect, it } from "vitest";
import { allowPublicAuthAction, resetPublicAuthRateLimitForTests } from "./publicActionRateLimit";

describe("proteção das ações públicas de autenticação", () => {
  beforeEach(resetPublicAuthRateLimitForTests);

  it("limita solicitações de recuperação de senha sem confiar em cabeçalhos falsificados", () => {
    const request = { ip: "203.0.113.33" };
    for (let i = 0; i < 10; i += 1) expect(allowPublicAuthAction(request, "password-reset", 0)).toBe(true);
    expect(allowPublicAuthAction(request, "password-reset", 0)).toBe(false);
    expect(allowPublicAuthAction({ ip: "203.0.113.34" }, "password-reset", 0)).toBe(true);
    expect(allowPublicAuthAction(request, "password-reset", 15 * 60 * 1000)).toBe(true);
  });

  it("limita cadastro sem bloquear outras operações da mesma origem", () => {
    const req = { ip: "192.0.2.21" };
    for (let i = 0; i < 15; i += 1) expect(allowPublicAuthAction(req, "register", 0)).toBe(true);
    expect(allowPublicAuthAction(req, "register", 0)).toBe(false);
    expect(allowPublicAuthAction(req, "password-reset", 0)).toBe(true);
  });
});
