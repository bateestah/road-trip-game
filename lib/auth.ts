import { cookies } from "next/headers";
import { randomBytes, createHash } from "crypto";

const CODE_VERIFIER_COOKIE = "trsg_pkce_verifier";
const CSRF_COOKIE = "trsg_csrf";

const SPOTIFY_AUTH = "https://accounts.spotify.com/authorize";
const SPOTIFY_TOKEN = "https://accounts.spotify.com/api/token";

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID!;
const REDIRECT_URI = `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/callback`;

function b64url(buf: Buffer | string) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf);
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export async function beginAuth() {
  const verifier = b64url(randomBytes(32));
  const challenge = b64url(createHash("sha256").update(verifier).digest());
  const state = b64url(randomBytes(16));

  const c = cookies();
  c.set(CODE_VERIFIER_COOKIE, verifier, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });
  c.set(CSRF_COOKIE, state, { httpOnly: true, secure: true, sameSite: "lax", path: "/", maxAge: 600 });

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    code_challenge_method: "S256",
    code_challenge: challenge,
    state,
    scope: [
      "user-read-email",
      "user-read-private",
      "playlist-read-private",
      "playlist-read-collaborative",
      "streaming",
      "user-read-playback-state",
      "user-modify-playback-state"
    ].join(" ")
  });

  return `${SPOTIFY_AUTH}?${params.toString()}`;
}

export async function finishAuth(code: string, state: string) {
  const c = cookies();
  const verifier = c.get(CODE_VERIFIER_COOKIE)?.value;
  const expectedState = c.get(CSRF_COOKIE)?.value;
  if (!verifier || !expectedState || state !== expectedState) throw new Error("Bad CSRF or verifier");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: CLIENT_ID,
    code_verifier: verifier
  });

  const res = await fetch(SPOTIFY_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!res.ok) throw new Error("Token exchange failed");
  const tok = await res.json();

  return {
    access_token: tok.access_token,
    refresh_token: tok.refresh_token,
    token_type: tok.token_type,
    scope: tok.scope,
    expires_at: Math.floor(Date.now()/1000) + tok.expires_in
  };
}

export async function refreshToken(refresh_token: string) {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token,
    client_id: CLIENT_ID
  });

  const res = await fetch(SPOTIFY_TOKEN, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body
  });

  if (!res.ok) throw new Error("Refresh failed");
  const tok = await res.json();

  return {
    access_token: tok.access_token,
    refresh_token: tok.refresh_token ?? refresh_token,
    token_type: tok.token_type,
    scope: tok.scope,
    expires_at: Math.floor(Date.now()/1000) + tok.expires_in
  };
}

