import { databaseOptions } from "./databaseConfig";

export function validateRuntimeEnvironment(env = process.env) {
  if (env.NODE_ENV !== "production") return;
  databaseOptions(env);
  if ((env.ROOT_INITIAL_PASSWORD?.trim().length ?? 0) < 8) {
    throw new Error("Configure ROOT_INITIAL_PASSWORD com pelo menos 8 caracteres.");
  }
  if ((env.JWT_SECRET?.length ?? 0) < 32) throw new Error("Configure JWT_SECRET com pelo menos 32 caracteres.");
  let publicUrl: URL;
  try { publicUrl = new URL(env.PUBLIC_APP_URL ?? ""); }
  catch { throw new Error("Configure PUBLIC_APP_URL."); }
  if (publicUrl.protocol !== "https:" || publicUrl.origin !== env.PUBLIC_APP_URL) {
    throw new Error("PUBLIC_APP_URL deve ser uma origem HTTPS sem barra final.");
  }
}
