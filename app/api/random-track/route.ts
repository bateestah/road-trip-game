import { NextResponse } from "next/server";
import { getSessionCookie } from "@/lib/cookies";
import { randomTrackByArtist, randomTrackByGenre, randomTrackFromPlaylist } from "@/lib/spotify";

export async function POST(req: Request) {
  const session = getSessionCookie();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json();

  try {
    let track = null;
    if (body.type === "artist") track = await randomTrackByArtist(session, body.id);
    if (body.type === "genre") track = await randomTrackByGenre(session, body.name);
    if (body.type === "playlist") track = await randomTrackFromPlaylist(session, body.id);

    return NextResponse.json(track ?? null);
  } catch {
    return NextResponse.json(null, { status: 200 });
  }
}
