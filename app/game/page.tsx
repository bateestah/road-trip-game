"use client";

import React, { useEffect, useState } from "react";
import PlayerSetup from "@/components/PlayerSetup";
import Game from "@/components/Game";

export default function GamePage() {
  const [authed, setAuthed] = useState<boolean>(false);
  const [checkedAuth, setCheckedAuth] = useState<boolean>(false); // optional: show nothing until we know
  const [players, setPlayers] = useState<string[]>([]); // move above any early returns

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me", { credentials: "include" });
        setAuthed(r.ok);
      } catch {
        setAuthed(false);
    } finally {
        setCheckedAuth(true);
      }
    })();
  }, []);

  if (!checkedAuth) {
    return <div className="text-sm text-slate-500">Loading…</div>;
  }

  return (
    <>
      {!authed ? (
        <div className="space-y-4">
          <p>Please sign in with Spotify to play.</p>
          <a className="rounded bg-emerald-600 text-white px-4 py-2" href="/api/auth/login">
            Sign in with Spotify
          </a>
        </div>
      ) : players.length === 0 ? (
        <PlayerSetup onStart={(p) => setPlayers(p)} />
      ) : (
        <Game players={players} />
      )}
    </>
  );
}
