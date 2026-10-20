import type { Express } from "express";
import { access } from "node:fs/promises";
import { ENV } from "./env";
import { resolveLocalStoragePath } from "../storage";
import { canAccessStoredContentPdf } from "../db";
import { resolveSessionUser } from "./context";

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req, res) => {
    const key = (req.params as Record<string, string>)[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    // Revoga URLs antigas de exportações administrativas; esta rota serve somente mídia pública.
    if (key.replaceAll(String.fromCharCode(92), "/").split("/").filter(Boolean)[0]?.toLowerCase() === "admin-backups") {
      res.status(404).end();
      return;
    }

    try {
      const isPrivatePdf = key.split("/")[0]?.toLowerCase() === "content-pdfs";
      if (isPrivatePdf) {
        res.set("Cache-Control", "private, no-store");
        const user = await resolveSessionUser(req);
        if (!user) return void res.sendStatus(403);
        if (user.role !== "admin" && !(await canAccessStoredContentPdf(user.id, `/manus-storage/${key}`))) return void res.sendStatus(403);
      }
      if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
        const filePath = resolveLocalStoragePath(key);
        await access(filePath);
        if (!isPrivatePdf) res.set("Cache-Control", "public, max-age=31536000, immutable");
        res.sendFile(filePath);
        return;
      }
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", isPrivatePdf ? "private, no-store" : "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
