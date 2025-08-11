import { NextResponse } from "next/server";
import { getSessionCookie } from "@/lib/cookies";
import { listGenres, searchArtists, searchPlaylists } from "@/lib/spotify";

export async function GET(req: Request) {
  const session = getSessionCookie();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const tab = (searchParams.get("tab") || "artist") as "artist"|"genre"|"playlist";
  try {
    if (tab === "artist") return NextResponse.json(await searchArtists(session, q));
    if (tab === "playlist") return NextResponse.json(await searchPlaylists(session, q));
    if (tab === "genre") return NextResponse.json(await listGenres(session, q));
    return NextResponse.json([]);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
