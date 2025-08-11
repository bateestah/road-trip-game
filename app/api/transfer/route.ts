import { NextResponse } from "next/server";
import { getSessionCookie } from "@/lib/cookies";
import { transferPlayback } from "@/lib/spotify";

export async function POST(req: Request) {
  const session = getSessionCookie();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { device_id } = await req.json();
  if (!device_id) return NextResponse.json({ error: "device_id required" }, { status: 400 });
  await transferPlayback(session, device_id, false);
  return NextResponse.json({ ok: true });
}
