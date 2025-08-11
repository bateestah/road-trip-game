import { NextResponse } from "next/server";
import { getSessionCookie, setSessionCookie } from "@/lib/cookies";
import { refreshToken } from "@/lib/auth";

export async function GET() {
  const session = getSessionCookie();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const now = Math.floor(Date.now()/1000);
  let tok = session;
  if (tok.expires_at - now < 60 && tok.refresh_token) {
    tok = await refreshToken(tok.refresh_token);
    setSessionCookie(tok);
  }
  return NextResponse.json({ access_token: tok.access_token, expires_at: tok.expires_at });
}
