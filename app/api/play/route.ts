import { NextResponse } from "next/server";
import { getSessionCookie } from "@/lib/cookies";
import { playOnDevice } from "@/lib/spotify";

export async function POST(req: Request) {
  const session = getSessionCookie();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { device_id, uri, position_ms } = await req.json();
  if (!device_id) return NextResponse.json({ error: "device_id required" }, { status: 400 });
  await playOnDevice(session, device_id, uri, position_ms);
  return NextResponse.json({ ok: true });
}
