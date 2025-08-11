import { getSessionCookie, setSessionCookie } from "@/lib/cookies";
import { refreshToken } from "@/lib/auth";
import type { SpotifyToken } from "@/lib/types";

export async function getFreshSession(): Promise<SpotifyToken | null> {
  const tok = getSessionCookie();
  if (!tok) return null;
  const now = Math.floor(Date.now() / 1000);
  if (tok.expires_at - now > 60 || !tok.refresh_token) return tok;
  const fresh = await refreshToken(tok.refresh_token);
  setSessionCookie(fresh);
  return fresh;
}
