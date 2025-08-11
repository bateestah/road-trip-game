import { cookies } from "next/headers";
import { decrypt, encrypt } from "./crypto";
import type { SpotifyToken } from "./types";

const COOKIE = process.env.SESSION_COOKIE_NAME || "trsg_session";

export function setSessionCookie(token: SpotifyToken) {
  const c = cookies();
  c.set(COOKIE, encrypt(token), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7
  });
}

export function getSessionCookie(): SpotifyToken | null {
  const c = cookies();
  const raw = c.get(COOKIE)?.value;
  if (!raw) return null;
  try { return decrypt<SpotifyToken>(raw); } catch { return null; }
}

export function clearSessionCookie() {
  const c = cookies();
  c.delete(COOKIE);
}
