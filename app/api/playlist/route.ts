export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getFreshSession } from "@/lib/session";
import { getPlaylist } from "@/lib/spotify";

export async function GET(req: Request) {
  const session = await getFreshSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  try {
    const data = await getPlaylist(session, id);
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
