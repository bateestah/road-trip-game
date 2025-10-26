import { NextResponse } from "next/server";
import { getFreshSession } from "@/lib/session";
import { randomTracksByArtist, randomTracksByGenre, randomTracksFromPlaylist } from "@/lib/spotify";

export async function POST(req: Request) {
  const session = await getFreshSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();

  const requestedCount = typeof body.count === "number" ? body.count : Number(body.count);
  const count = Number.isFinite(requestedCount)
    ? Math.max(1, Math.min(10, Math.floor(requestedCount)))
    : 1;

  try {
    let tracks: any[] = [];
    if (body.type === "artist") tracks = await randomTracksByArtist(session, body.id, count);
    if (body.type === "genre") tracks = await randomTracksByGenre(session, body.name, count);
    if (body.type === "playlist") tracks = await randomTracksFromPlaylist(session, body.id, count);

    return NextResponse.json({ tracks });
  } catch (e) {
    return NextResponse.json({ tracks: [] }, { status: 200 });
  }
}
