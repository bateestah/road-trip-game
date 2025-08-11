import { NextResponse } from "next/server";
import { getSessionCookie, setSessionCookie, clearSessionCookie } from "@/lib/cookies";
import { refreshToken } from "@/lib/auth";

export async function POST() {
  const session = getSessionCookie();
  if (!session?.refresh_token) return NextResponse.json({ error: "no refresh" }, { status: 401 });

  try {
    const fresh = await refreshToken(session.refresh_token);
    setSessionCookie(fresh);
    return NextResponse.json({ ok: true });
  } catch {
    clearSessionCookie();
    return NextResponse.json({ error: "refresh failed" }, { status: 401 });
  }
}
