import { NextResponse } from "next/server";
import { getSessionCookie } from "@/lib/cookies";
import { pause } from "@/lib/spotify";

export async function POST(req: Request) {
  const session = getSessionCookie();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { device_id } = await req.json();
  await pause(session, device_id);
  return NextResponse.json({ ok: true });
}
