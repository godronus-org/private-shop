import { sign, verify } from "hono/jwt";

export const AUTH_COOKIE = "auth_token";
export const TOKEN_MAX_AGE = 60 * 60 * 8; // 8 hours

export async function mintToken(username: string, secret: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return sign({ sub: username, iat: now, exp: now + TOKEN_MAX_AGE }, secret, "HS256");
}

export async function verifyToken(token: string, secret: string): Promise<string | null> {
  try {
    const payload = await verify(token, secret, "HS256");
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}
