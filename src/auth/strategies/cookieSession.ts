import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import { createSession, lookupSession, deleteSession, SESSION_COOKIE, SESSION_TTL } from "../session";
import type { AuthStrategy } from "../types";

// Opaque session id in an HttpOnly cookie, backed by the POP-local
// fastedge::cache store. Enables the /manage-sessions admin surface.
export const cookieSessionStrategy: AuthStrategy = {
  localLogin: true,
  sessionAdmin: true,

  async authenticate(c) {
    const id = getCookie(c, SESSION_COOKIE);
    return id ? lookupSession(id) : null;
  },

  async issue(c, user) {
    const id = await createSession(user);
    setCookie(c, SESSION_COOKIE, id, {
      httpOnly: true,
      secure: true,
      sameSite: "Lax",
      path: "/",
      maxAge: SESSION_TTL,
    });
    return true;
  },

  async revoke(c) {
    const id = getCookie(c, SESSION_COOKIE);
    if (id) await deleteSession(id);
    deleteCookie(c, SESSION_COOKIE, { path: "/" });
  },
};
