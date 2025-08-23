"use client";
import React, { useEffect, useState } from "react";

export type SearchTarget =
  | { type: "artist"; id: string; name: string }
  | { type: "genre"; name: string }
  | { type: "playlist"; id: string; name: string };

type ArtistOrPlaylist = { id: string; name: string };

function extractPlaylistId(input: string): string | null {
  const urlMatch = input.match(/playlist[/:]([a-zA-Z0-9]+)/);
  return urlMatch ? urlMatch[1] : null;
}

export default function SearchBox({ onPick }: { onPick: (t: SearchTarget) => void }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"artist" | "genre" | "playlist">("artist");

  // Keep separate result buckets per tab to avoid shape mismatch
  const [artistResults, setArtistResults] = useState<ArtistOrPlaylist[]>([]);
  const [playlistResults, setPlaylistResults] = useState<ArtistOrPlaylist[]>([]);
  const [genreResults, setGenreResults] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Clear results when switching tabs (prevents stale render crash)
  useEffect(() => {
    setArtistResults([]);
    setPlaylistResults([]);
    setGenreResults([]);
  }, [tab]);

  useEffect(() => {
    const t = setTimeout(async () => {
      const query = q.trim();
      if (!query) {
        setArtistResults([]); setPlaylistResults([]); setGenreResults([]);
        return;
      }
      if (tab === "playlist") {
        const id = extractPlaylistId(query);
        if (id) {
          setLoading(true);
          try {
            const r = await fetch(`/api/playlist?id=${encodeURIComponent(id)}`);
            if (r.ok) {
              const data = await r.json();
              setPlaylistResults(data ? [data] : []);
            } else {
              setPlaylistResults([]);
            }
          } catch {
            setPlaylistResults([]);
          } finally {
            setLoading(false);
          }
          return;
        }
      }

      setLoading(true);
      try {
        const r = await fetch(`/api/search?tab=${tab}&q=${encodeURIComponent(query)}`);
        if (!r.ok) {
          setArtistResults([]); setPlaylistResults([]); setGenreResults([]);
        } else {
          const data = await r.json();
          if (tab === "artist") setArtistResults(Array.isArray(data) ? data : []);
          if (tab === "playlist") setPlaylistResults(Array.isArray(data) ? data : []);
          if (tab === "genre") setGenreResults(Array.isArray(data) ? data : []);
        }
      } catch {
        setArtistResults([]); setPlaylistResults([]); setGenreResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q, tab]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["artist", "genre", "playlist"] as const).map(t =>
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1 border ${tab===t ? "bg-black text-white" : "bg-white"}`}>
            {t}
          </button>
        )}
      </div>

      <input
        value={q}
        onChange={(e)=>setQ(e.target.value)}
        placeholder={tab === "playlist" ? "Search or paste playlist link..." : `Search ${tab}...`}
        className="w-full rounded border px-3 py-2"
      />

      {loading && <div className="text-sm text-slate-500">Searching…</div>}

      <ul className="divide-y rounded border bg-white">
        {tab === "artist" && artistResults.map((r) => (
          <li key={r.id} className="p-3 hover:bg-slate-50 cursor-pointer"
              onClick={() => onPick({ type:"artist", id:r.id, name:r.name })}>
            {r.name}
          </li>
        ))}
        {tab === "playlist" && playlistResults.map((r) => (
          <li key={r.id} className="p-3 hover:bg-slate-50 cursor-pointer"
              onClick={() => onPick({ type:"playlist", id:r.id, name:r.name })}>
            {r.name}
          </li>
        ))}
        {tab === "genre" && genreResults.map((g) => (
          <li key={g} className="p-3 hover:bg-slate-50 cursor-pointer"
              onClick={() => onPick({ type:"genre", name:g })}>
            {g}
          </li>
        ))}

        {!loading && q && (
          (tab==="artist" && artistResults.length===0) ||
          (tab==="playlist" && playlistResults.length===0) ||
          (tab==="genre" && genreResults.length===0)
        ) && (
          <li className="p-3 text-sm text-slate-500">
            No results{tab==="genre" ? " (tip: try seeds like pop, rock, hip-hop, metal, edm, country, jazz…)" : ""}.
          </li>
        )}
      </ul>
    </div>
  );
}
