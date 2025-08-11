"use client";
import React, { useEffect, useState } from "react";

export type SearchTarget =
  | { type: "artist"; id: string; name: string }
  | { type: "genre"; name: string }
  | { type: "playlist"; id: string; name: string };

export default function SearchBox({ onPick }: { onPick: (t: SearchTarget) => void }) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<"artist" | "genre" | "playlist">("artist");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!q.trim()) { setResults([]); return; }
      setLoading(true);
      const r = await fetch(`/api/search?tab=${tab}&q=${encodeURIComponent(q)}`);
      setResults(r.ok ? await r.json() : []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(t);
  }, [q, tab]);

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        {(["artist", "genre", "playlist"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-full px-3 py-1 border ${tab===t ? "bg-black text-white" : "bg-white"}`}>
            {t}
          </button>
        ))}
      </div>
      <input value={q} onChange={(e)=>setQ(e.target.value)} placeholder={`Search ${tab}...`}
        className="w-full rounded border px-3 py-2" />
      {loading && <div className="text-sm text-slate-500">Searching…</div>}
      <ul className="divide-y rounded border bg-white">
        {results.map((r, i) => (
          <li key={i} className="p-3 hover:bg-slate-50 cursor-pointer"
            onClick={()=>{
              if (tab==="artist") onPick({ type:"artist", id:r.id, name:r.name });
              if (tab==="playlist") onPick({ type:"playlist", id:r.id, name:r.name });
              if (tab==="genre") onPick({ type:"genre", name:r } as any);
            }}>
            {tab==="genre" ? r : r.name}
          </li>
        ))}
        {results.length===0 && q && !loading && <li className="p-3 text-sm text-slate-500">No results.</li>}
      </ul>
    </div>
  );
}
