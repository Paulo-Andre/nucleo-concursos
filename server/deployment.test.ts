import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { databaseOptions } from "./databaseConfig";
import { validateRuntimeEnvironment } from "./runtimeConfig";
import { createHealthHandler } from "./health";

const env = {
  NODE_ENV: "production",
  DATABASE_URL: "mysql://user:p%40ss@db.example:1234/nucleo",
  ROOT_INITIAL_PASSWORD: "test-password",
  JWT_SECRET: "a".repeat(32),
  PUBLIC_APP_URL: "https://nucleo.example",
};

describe("configuração de implantação", () => {
  it("mantém TLS e validação do certificado em produção mesmo com flag false", () => {
    expect(databaseOptions({ ...env, DATABASE_SSL: "false" })).toMatchObject({
      host: "db.example", port: 1234, password: "p@ss", database: "nucleo",
      ssl: { rejectUnauthorized: true }, connectionLimit: 5,
    });
  });
  it("aceita CA fornecida pelo provedor e MySQL local sem TLS em desenvolvimento", () => {
    expect(databaseOptions({ ...env, DATABASE_CA_CERT: "line1\\nline2" }).ssl).toMatchObject({ ca: "line1\nline2" });
    expect(databaseOptions({ DATABASE_URL: env.DATABASE_URL }).ssl).toBeUndefined();
  });
  it("recusa PostgreSQL e configuração incompleta sem incluir segredos no erro", () => {
    expect(() => databaseOptions({ DATABASE_URL: "postgres://user:secret@host/db" })).toThrow("MySQL");
    expect(() => validateRuntimeEnvironment({ ...env, ROOT_INITIAL_PASSWORD: "" })).toThrow("ROOT_INITIAL_PASSWORD");
    expect(() => validateRuntimeEnvironment({ ...env, PUBLIC_APP_URL: "http://example.com" })).toThrow("HTTPS");
    expect(() => validateRuntimeEnvironment({ ...env, PUBLIC_APP_URL: "https://example.com/" })).toThrow("HTTPS");
    expect(() => validateRuntimeEnvironment(env)).not.toThrow();
  });
});

describe("health check", () => {
  function response() {
    return { setHeader: vi.fn(), status: vi.fn().mockReturnThis(), json: vi.fn() };
  }
  it("retorna 200 quando o banco responde", async () => {
    const res = response();
    await createHealthHandler(async () => {} )({} as Request, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(200);
  });
  it("retorna 503 sem vazar detalhes quando o banco falha", async () => {
    const res = response();
    await createHealthHandler(async () => { throw new Error("private-db-details"); })({} as Request, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(503);
    expect(res.json).toHaveBeenCalledWith({ status: "unavailable" });
  });
  it("limita o tempo de espera por uma conexão travada", async () => {
    const res = response();
    await createHealthHandler(() => new Promise(() => {}), 5)({} as Request, res as unknown as Response);
    expect(res.status).toHaveBeenCalledWith(503);
  });
});
