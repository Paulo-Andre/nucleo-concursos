import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  reset: vi.fn(),
  find: vi.fn(),
  seedCourses: vi.fn(),
  seedKnowledge: vi.fn(),
  createLocalUser: vi.fn(),
}));

vi.mock("../_core/env", () => ({ ENV: { ownerOpenId: "", rootInitialPassword: "QA-only-password" } }));
vi.mock("./rootConfig", () => ({ hasRootBootstrapSecret: () => true }));
vi.mock("./localAuth", () => ({ hashPassword: vi.fn(async () => "hash-for-testing") }));
vi.mock("../db", () => ({
  convertUserToLocalRoot: vi.fn(),
  createLocalUser: mocks.createLocalUser,
  ensureDefaultCourses: mocks.seedCourses,
  ensureDefaultKnowledgeBase: mocks.seedKnowledge,
  hasPrelaunchCatalogReset: mocks.reset,
  getUserByOpenId: vi.fn(),
  getUserByUsername: mocks.find,
  updateUserRole: vi.fn(),
}));

import { ensureRootAccount } from "./rootBootstrap";

describe("limpeza de catálogo persistente no reinício", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.find.mockResolvedValue({
      id: 17, username: "paulo", role: "admin", loginMethod: "local",
      openId: "local:paulo", passwordHash: "hash-existing",
    });
  });

  it("não repovoa cursos, conteúdos ou questões após limpeza pré-lançamento", async () => {
    mocks.reset.mockResolvedValue(true);
    await ensureRootAccount();
    expect(mocks.reset).toHaveBeenCalledOnce();
    expect(mocks.seedCourses).not.toHaveBeenCalled();
    expect(mocks.seedKnowledge).not.toHaveBeenCalled();
    expect(mocks.createLocalUser).not.toHaveBeenCalled();
  });

  it("mantém comportamento inicial para instalações sem marcador de limpeza", async () => {
    mocks.reset.mockResolvedValue(false);
    await ensureRootAccount();
    expect(mocks.seedCourses).toHaveBeenCalledWith(17);
    expect(mocks.seedKnowledge).toHaveBeenCalledWith(17);
  });
});
