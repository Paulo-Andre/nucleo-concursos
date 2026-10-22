import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { Request } from "express";
import type { User } from "../../drizzle/schema";
import { parse as parseCookieHeader } from "cookie";
import { getUserFromSessionHash } from "../db";
import { hashSessionToken, LOCAL_SESSION_COOKIE } from "../auth/localAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function resolveSessionUser(req: Pick<Request, "headers">): Promise<User | null> {
  try {
    const cookies = parseCookieHeader(req.headers.cookie ?? "");
    const token = cookies[LOCAL_SESSION_COOKIE];
    if (!token) return null;
    const user = await getUserFromSessionHash(hashSessionToken(token)) ?? null;
    return user?.isBlocked ? null : user;
  } catch {
    return null;
  }
}

export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  return { req: opts.req, res: opts.res, user: await resolveSessionUser(opts.req) };
}
