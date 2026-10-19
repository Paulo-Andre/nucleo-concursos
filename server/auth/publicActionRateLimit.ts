import type { Request } from "express";

type PublicAction = "register" | "password-reset";
const POLICIES: Record<PublicAction, { max: number; windowMs: number }> = {
  register: { max: 15, windowMs: 60 * 60 * 1000 },
  "password-reset": { max: 10, windowMs: 15 * 60 * 1000 },
};

const attempts = new Map<string, { count: number; start: number }>();
let calls = 0;

export function allowPublicAuthAction(req: Pick<Request, "ip">, action: PublicAction, now = Date.now()) {
  const policy = POLICIES[action];
  // Somente req.ip do Express, jamais X-Forwarded-For controlado pelo cliente.
  const ip = req.ip || "unknown";
  const key = `${action}:${ip.slice(0, 120)}`;
  const existing = attempts.get(key);
  const row = !existing || now - existing.start >= policy.windowMs ? { count: 0, start: now } : existing;
  const allowed = row.count < policy.max;
  if (allowed) row.count += 1;
  attempts.set(key, row);

  // Elimina chaves expiradas para não manter memória ilimitada.
  if (++calls % 128 === 0) for (const [storedKey, stored] of attempts) {
    const kind = storedKey.split(":")[0] as PublicAction;
    if (now - stored.start >= POLICIES[kind].windowMs) attempts.delete(storedKey);
  }
  return allowed;
}

export function resetPublicAuthRateLimitForTests() {
  attempts.clear();
  calls = 0;
}
