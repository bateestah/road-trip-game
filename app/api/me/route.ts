import { NextResponse } from "next/server";
import { getSessionCookie } from "@/lib/cookies";

export async function GET() {
  const session = getSessionCookie();
  if (!session) return NextResponse.json({ ok: false }, { status: 401 });
  return NextResponse.json({ ok: true });
}
