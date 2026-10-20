import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const scriptPath = fileURLToPath(new URL("../scripts/clean-launch-selfhost.sh", import.meta.url));
const script = readFileSync(scriptPath, "utf8");
const schema = readFileSync(new URL("../drizzle/schema.ts", import.meta.url), "utf8");
const tables = [...schema.matchAll(/export const \w+ = mysqlTable\("([^"]+)"/g)].map(match => match[1]);

describe("limpeza pré-lançamento", () => {
  it("preserva a sintaxe do instalador seguro", () => {
    expect(() => execFileSync("bash", ["-n", scriptPath])).not.toThrow();
  });

  it("cobre todas as tabelas da aplicação sem apagar estrutura de migrações", () => {
    const removed = tables.filter(name => name !== "users" && name !== "adminAuditLogs");
    expect(removed.length).toBeGreaterThan(30);
    for (const table of removed) expect(script).toContain(`DELETE FROM ${table};`);
    expect(script).toContain("DELETE FROM users WHERE id <> @paulo_id");
    expect(script).toContain("LIMPEZA_CATALOGO_PRE_LANCAMENTO");
    expect(script).not.toMatch(/TRUNCATE TABLE|DROP TABLE|DELETE FROM __drizzle_migrations/i);
  });

  it("exige confirmação, versão validada, backup e bloqueia tabelas desconhecidas", () => {
    expect(script).toContain("APAGAR_TUDO_MENOS_PAULO");
    expect(script).toContain("NUCLEO_CLEAN_RELEASE_SHA");
    expect(script).toContain("unknown_tables");
    expect(script).toContain("banco-antes.sql");
    expect(script).toContain("sha256sum -c SHA256SUMS");
    expect(script).toContain("docker compose stop app");
    expect(script).toContain("docker compose up -d --no-deps --no-build app");
  });
});
