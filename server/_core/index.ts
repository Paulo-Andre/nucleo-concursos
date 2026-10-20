import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerStorageProxy } from "./storageProxy";
import { appRouter } from "../routers";
import { createContext, resolveSessionUser } from "./context";
import { takePrivateBackupDownload, disposePrivateBackupDownload } from "../privateBackupDownloads";
import { serveStatic, setupVite } from "./vite";
import { ensureRootAccount } from "../auth/rootBootstrap";
import { processMercadoPagoWebhook, resolveMercadoPagoNotificationDataId } from "../mercadoPago";
import { weeklyResetHandler } from "../weeklyReset";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  await ensureRootAccount();
  const app = express();
  const server = createServer(app);
  app.disable("x-powered-by");
  // Somente proxy local é confiável por padrão; configure TRUST_PROXY para CIDRs explícitos se necessário.
  app.set("trust proxy", process.env.TRUST_PROXY?.trim() || "loopback");
  app.use((req, res, next) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    // A prévia ROOT é carregada pela mesma origem; as demais páginas seguem sem poder ser incorporadas.
    const isSameOriginStorefrontPreview = req.path === "/" && req.query.preview === "storefront";
    res.setHeader("X-Frame-Options", isSameOriginStorefrontPreview ? "SAMEORIGIN" : "DENY");
    res.setHeader("Content-Security-Policy", isSameOriginStorefrontPreview ? "frame-ancestors 'self'" : "frame-ancestors 'none'");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    res.setHeader("Permissions-Policy", "camera=(), geolocation=(), microphone=()");
    res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
    next();
  });
  // Arquivos PDF de até 10 MB são codificados em base64 (~13,4 MB).
  // Endpoints administrativos validam autorização, tipo e tamanho real antes de armazenar.
  app.use(express.json({ limit: "16mb" }));
  app.use(express.urlencoded({ limit: "8mb", extended: true }));
  registerStorageProxy(app);
  app.get("/api/admin/backups/:token", async (req, res) => {
    // Downloads exigem sessão ROOT viva, sem cache e com token único de cinco minutos.
    res.setHeader("Cache-Control", "no-store, private");
    res.setHeader("X-Content-Type-Options", "nosniff");
    const user = await resolveSessionUser(req);
    if (!user || user.role !== "admin") return res.sendStatus(403);
    const backup = takePrivateBackupDownload(req.params.token, user.id);
    if (!backup) return res.sendStatus(404);
    res.download(backup.filePath, backup.fileName, {
      headers: { "Cache-Control": "no-store, private", "Content-Type": "application/json" },
    }, error => {
      void disposePrivateBackupDownload(backup).catch(() => {});
      if (error && !res.headersSent) res.sendStatus(500);
    });
  });
  app.post("/api/payments/mercado-pago/webhook", async (req, res) => {
    try {
      const dataId = resolveMercadoPagoNotificationDataId({
        queryDataId: req.query["data.id"],
        queryId: req.query.id,
        body: req.body,
      });
      const result = await processMercadoPagoWebhook({
        xSignature: req.header("x-signature"),
        xRequestId: req.header("x-request-id"),
        dataId,
        topic: req.query.topic ?? req.body?.type,
        isOfficialSimulation: req.body?.live_mode === false && dataId === "123456",
      });
      res.status(200).json({ received: true, result: result.action });
    } catch (error) {
      console.error("[Mercado Pago webhook] rejeitado:", error instanceof Error ? error.message : error);
      res.status(400).json({ received: false });
    }
  });
  app.post("/api/scheduled/weeklyReset", weeklyResetHandler);
  // tRPC API
  app.use((req, res, next) => {
    if (req.method !== "POST" || !req.path.startsWith("/api/trpc")) return next();
    const source = req.get("origin");
    const fetchSite = req.get("sec-fetch-site");
    if (fetchSite === "cross-site") return res.status(403).json({ error: "Origem não autorizada" });
    if (source) {
      try {
        if (new URL(source).host !== req.get("host")) return res.status(403).json({ error: "Origem não autorizada" });
      } catch {
        return res.status(403).json({ error: "Origem não autorizada" });
      }
    }
    next();
  });
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
