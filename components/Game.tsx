"use client";
import React, { useEffect, useState } from "react";
import SearchBox, { SearchTarget } from "./SearchBox";
import Scoreboard from "./Scoreboard";
import useSpotifyDevice from "./SpotifyPlayer";

type Track = {
  id: string;
  uri: string;
  name: string;
  artists: string[];
  external_url: string;
  artwork: string | null;
};

export default function Game({ players }: { players: string[] }) {
  const [scores, setScores] = useState<number[]>(players.map(() => 0));
  const [turnIndex, setTurnIndex] = useState(0);
  const [target, setTarget] = useState<SearchTarget | null>(null);
  const [current, setCurrent] = useState<Track | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [extended, setExtended] = useState(false);

  // NEW: track result and prevent immediate repeats
  const [result, setResult] = useState<null | "correct" | "wrong">(null);
  const [lastTrackId, setLastTrackId] = useState<string | null>(null);

  const { ready, activate, playUriAt, resume, pause } = useSpotifyDevice();
  const [sdkActivated, setSdkActivated] = useState(false);

  const nextTurn = () => setTurnIndex((i) => (i + 1) % players.length);

  function normalize(s: string) {
    return s.toLowerCase().replace(/[\p{P}\s]+/gu, "").trim();
  }

  const [guessArtist, setGuessArtist] = useState("");
  const [guessSong, setGuessSong] = useState("");

  async function ensureActivated() {
    if (!sdkActivated) {
      await activate();
      setSdkActivated(true);
    }
  }

  async function loadRandom() {
    if (!target) return;
    setRevealed(false);
    setExtended(false);
    setGuessArtist("");
    setGuessSong("");
    setResult(null);

    let tries = 0;
    let t: Track | null = null;

    do {
      const r = await fetch("/api/random-track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(target),
      });
      if (!r.ok) {
        setCurrent(null);
        return;
      }
      t = await r.json();
      tries++;
      // Avoid same song twice in a row
    } while (t && t.id && lastTrackId && t.id === lastTrackId && tries < 5);

    setCurrent(t);
    if (t?.id) setLastTrackId(t.id);
  }

  async function playInitial() {
    if (!current?.uri || !ready) return;
    await ensureActivated();
    await playUriAt(current.uri, 0);
    setTimeout(() => {
      pause();
    }, 1000);
  }

  async function extendFive() {
    if (!current?.uri || !ready) return;
    await ensureActivated();
    await resume();
    setExtended(true);
    setTimeout(() => {
      pause();
    }, 5000);
  }

  function submitGuesses() {
    if (!current) return;
    let delta = 0;
    const artistSet = current.artists.map(normalize);
    if (guessArtist && artistSet.some((a) => normalize(guessArtist) === a)) delta += 1;
    if (guessSong && normalize(guessSong) === normalize(current.name)) delta += 1;

    if (delta > 0) {
      setScores((prev) => prev.map((s, i) => (i === turnIndex ? s + delta : s)));
      setResult("correct");
    } else {
      setResult("wrong");
    }
    setRevealed(true);
  }

  useEffect(() => {
    if (target) {
      loadRandom();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return (
    <div className="space-y-6">
      <Scoreboard players={players} scores={scores} currentIndex={turnIndex} />

      <div className="rounded border bg-white p-4 space-y-4 dark:bg-slate-800 dark:border-slate-700">
        <h3 className="font-semibold">Pick an artist, genre, or playlist (paste a link)</h3>
        <SearchBox onPick={setTarget} />
      </div>

      {target && (
        <div className="rounded border bg-white p-4 space-y-4 dark:bg-slate-800 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-600 dark:text-slate-400">
                Round for: <b>{players[turnIndex]}</b>
              </div>
              <div className="text-xs dark:text-slate-400">
                Target:{" "}
                <b>
                  {target.type === "genre"
                    ? `Genre • ${target.name}`
                    : target.type === "artist"
                    ? `Artist • ${target.name}`
                    : `Playlist • ${target.name}`}
                </b>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                className="rounded border px-3 py-1 dark:border-slate-600 dark:bg-slate-700"
                onClick={loadRandom}
              >
                New random
              </button>
              <button
                className="rounded bg-emerald-600 text-white px-3 py-1 hover:bg-emerald-700"
                onClick={playInitial}
                disabled={!current?.uri || !ready}
              >
                Play 1s
              </button>
              <button
                className="rounded bg-slate-700 text-white px-3 py-1"
                onClick={extendFive}
                disabled={!current?.uri || !ready || extended}
              >
                I don’t know (+5s)
              </button>
            </div>
          </div>

          {!current && (
            <div className="text-sm text-slate-500 dark:text-slate-400">
              No track found. Try again.
            </div>
          )}

          {current && (
            <>
              <div className="flex items-center gap-3">
                {current.artwork && <img src={current.artwork} alt="" className="h-16 w-16 rounded" />}
                <div className="text-sm text-slate-600 dark:text-slate-400">
                  Guess the <b>artist</b> and <b>song</b> name.
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="rounded border px-3 py-2 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                  placeholder="Artist"
                  value={guessArtist}
                  onChange={(e) => setGuessArtist(e.target.value)}
                />
                <input
                  className="rounded border px-3 py-2 dark:bg-slate-700 dark:border-slate-600 dark:text-slate-100"
                  placeholder="Song"
                  value={guessSong}
                  onChange={(e) => setGuessSong(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <button
                  className="rounded bg-emerald-600 text-white px-4 py-2 hover:bg-emerald-700"
                  onClick={submitGuesses}
                >
                  Submit guess
                </button>

                {revealed && (
                  <button
                    className="rounded border px-3 py-2 dark:border-slate-600 dark:bg-slate-700"
                    onClick={async () => {
                      setGuessArtist("");
                      setGuessSong("");
                      setRevealed(false);
                      setExtended(false);
                      setResult(null);
                      await loadRandom(); // keep same target, fetch a new random track
                      nextTurn(); // then advance to the next player
                    }}
                  >
                    Next player
                  </button>
                )}

                {current.external_url && (
                  <a
                    className="ml-auto text-sm underline dark:text-slate-300"
                    href={current.external_url}
                    target="_blank"
                  >
                    Open in Spotify
                  </a>
                )}
              </div>

              {/* Wrong banner */}
              {revealed && result === "wrong" && (
                <div className="rounded border border-red-200 bg-red-50 p-3 text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-300">
                  <div className="font-semibold">WRONG</div>
                </div>
              )}

              {/* Always show the answer once revealed */}
              {revealed && (
                <div className="rounded bg-emerald-50 border border-emerald-200 p-3 dark:bg-emerald-900 dark:border-emerald-700">
                  <div className="font-medium">Answer</div>
                  <div className="text-sm">
                    {current.artists.join(", ")} — {current.name}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
