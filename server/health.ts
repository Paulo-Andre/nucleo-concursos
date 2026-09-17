import type { Request, Response } from "express";

export function createHealthHandler(checkDatabase: () => Promise<void>, timeoutMs = 3000) {
  return async (_req: Request, res: Response) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    res.setHeader("Cache-Control", "no-store");
    try {
      await Promise.race([
        checkDatabase(),
        new Promise<never>((_, reject) => {
          timer = setTimeout(() => reject(new Error("timeout")), timeoutMs);
        }),
      ]);
      res.status(200).json({ status: "ok" });
    } catch {
      res.status(503).json({ status: "unavailable" });
    } finally {
      clearTimeout(timer);
    }
  };
}
