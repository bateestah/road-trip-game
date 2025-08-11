import { NextResponse } from "next/server";
import { finishAuth } from "@/lib/auth";
import { setSessionCookie } from "@/lib/cookies";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state") || "";
  if (!code) return NextResponse.redirect("/", { status: 302 });

  try {
    const token = await finishAuth(code, state);
    setSessionCookie(token);
    return NextResponse.redirect(new URL("/game", process.env.NEXT_PUBLIC_APP_URL));
  } catch {
    return NextResponse.redirect(new URL("/", process.env.NEXT_PUBLIC_APP_URL));
  }
}
