export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { getFreshSession } from "@/lib/session";
import { listGenres, searchArtists, searchPlaylists } from "@/lib/spotify";

export async function GET(req: Request) {
  const session = await getFreshSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const q = searchParams.get("q") || "";
  const tab = (searchParams.get("tab") || "artist") as "artist" | "genre" | "playlist";
  const debug = searchParams.get("debug") === "1";

  try {
    if (tab === "artist") {
      const data = await searchArtists(session, q);
      return NextResponse.json(data);
    }
    if (tab === "playlist") {
      const data = await searchPlaylists(session, q);
      return NextResponse.json(data);
    }
   if (tab === "genre") {
  // Try Spotify's seeds; if it fails, use a fallback list.
  let seeds: string[] = [];
  try {
    seeds = await listGenres(session, q); // string[]
  } catch {
    seeds = [
      "pop","rock","hip-hop","r-n-b","edm","indie","country","jazz","classical",
      "metal","soul","punk","blues","reggae","latin","folk","dance","house",
      "techno","ambient","trap","k-pop","j-pop","afrobeats","disco","funk","lo-fi"
    ];
  }

  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "-");
  const needle = norm(q);
  const pool = (seeds ?? []).map(norm);

  // Show filtered matches when user types; otherwise show a friendly starter set present in pool
  const starters = [
    "pop","rock","hip-hop","r-n-b","edm","indie","country",
    "jazz","classical","metal","soul","punk","blues","reggae","latin"
  ];

  const out = (needle && needle.length >= 2)
    ? pool.filter(g => g.includes(needle))
    : starters.filter(s => pool.includes(s));

  const unique = Array.from(new Set(out)).slice(0, 30);
  return NextResponse.json(unique);
}


    return NextResponse.json([]);
  } catch (e: any) {
    if (debug) {
      return NextResponse.json({ error: "search_failed", message: String(e?.message || e) }, { status: 500 });
    }
    return NextResponse.json([], { status: 200 });
  }
}
