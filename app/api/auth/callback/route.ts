import { NextResponse } from "next/server";
import { finishAuth } from "@/lib/auth";
import { setSessionCookie } from "@/lib/cookies";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") || "";
  if (!code) return NextResponse.json({ error: "missing code" }, { status: 400 });

  try {
    const token = await finishAuth(code, state);
    setSessionCookie(token);
    return NextResponse.redirect(new URL("/game", process.env.NEXT_PUBLIC_APP_URL));
  } catch (e: any) {
    // TEMP: show the real error so we can fix it
    return NextResponse.json({ error: "callback_failed", message: String(e?.message || e) }, { status: 500 });
  }
}
