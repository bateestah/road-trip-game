"use client";

import React from "react";
import PlayerSetup from "@/components/PlayerSetup";
import Game from "@/components/Game";
import { useEffect, useState } from "react";

export default function GamePage() {
  const [authed, setAuthed] = useState<boolean>(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/me", { credentials: "include" });
        setAuthed(r.ok);
      } catch {
        setAuthed(false);
      }
    })();
  }, []);

  if (!authed) {
    return (
      <div className="space-y-4">
        <p>Please sign in with Spotify to play.</p>
        <a className="rounded bg-emerald-600 text-white px-4 py-2" href="/api/auth/login">
          Sign in with Spotify
        </a>
      </div>
    );
  }

  const [players, setPlayers] = useState<string[]>([]);
  return players.length === 0 ? (
    <PlayerSetup onStart={(p) => setPlayers(p)} />
  ) : (
    <Game players={players} />
  );
}
