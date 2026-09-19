import type { PoolOptions } from "mysql2/promise";

/** Shared by the application and migration runner; never log these options. */
export function databaseOptions(env = process.env): PoolOptions {
  if (!env.DATABASE_URL) throw new Error("DATABASE_URL é obrigatória.");
  let url: URL;
  try { url = new URL(env.DATABASE_URL); }
  catch { throw new Error("DATABASE_URL inválida."); }
  if (url.protocol !== "mysql:" || !url.hostname || url.pathname.length < 2) {
    throw new Error("DATABASE_URL deve apontar para um banco MySQL.");
  }
  const useTls = env.NODE_ENV === "production" || env.DATABASE_SSL === "true";
  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    connectTimeout: 10000,
    connectionLimit: 5,
    waitForConnections: true,
    queueLimit: 20,
    ...(useTls ? { ssl: {
      rejectUnauthorized: true,
      ...(env.DATABASE_CA_CERT ? { ca: env.DATABASE_CA_CERT.replace(/\\n/g, "\n") } : {}),
    } } : {}),
  };
}
