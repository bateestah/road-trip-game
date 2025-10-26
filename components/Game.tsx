"use client";
import React, { useCallback, useEffect, useRef, useState } from "react";
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
  const [queue, setQueue] = useState<Track[]>([]);
  const queueRef = useRef<Track[]>([]);
  const queueFetchInFlight = useRef<Promise<Track[]> | null>(null);
  const desiredQueueSize = 4;

  // NEW: track result and prevent immediate repeats
  const [result, setResult] = useState<null | "correct" | "wrong">(null);
  const [lastTrackId, setLastTrackId] = useState<string | null>(null);

  const {
    ready,
    activate,
    playUriAt,
    resume: resumePlayback,
    pause: pausePlayback,
    waitForPlaybackStart,
  } = useSpotifyDevice();
  const [sdkActivated, setSdkActivated] = useState(false);
  const pauseTimeoutRef = useRef<number | null>(null);

  const nextTurn = () => setTurnIndex((i) => (i + 1) % players.length);

  function normalize(s: string) {
    return s.toLowerCase().replace(/[\p{P}\s]+/gu, "").trim();
  }

  const [guessArtist, setGuessArtist] = useState("");
  const [guessSong, setGuessSong] = useState("");

  const ensureActivated = useCallback(async () => {
    if (!sdkActivated) {
      await activate();
      setSdkActivated(true);
    }
  }, [activate, sdkActivated]);

  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const fetchBatch = useCallback(async (): Promise<Track[]> => {
    if (!target) return [];
    if (queueFetchInFlight.current) {
      return queueFetchInFlight.current;
    }

    const pending = (async () => {
      try {
        const r = await fetch("/api/random-track", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...target, count: desiredQueueSize }),
        });
        if (!r.ok) return [];
        const data = await r.json();
        const incoming: Track[] = Array.isArray(data?.tracks) ? data.tracks : [];
        const seenIds = new Set(queueRef.current.map((q) => q.id));
        if (lastTrackId) {
          seenIds.add(lastTrackId);
        }
        const filtered = incoming.filter((track) => track && !seenIds.has(track.id));
        if (filtered.length > 0) return filtered;
        return incoming.filter((track) => track && !queueRef.current.some((q) => q.id === track.id));
      } catch {
        return [];
      } finally {
        queueFetchInFlight.current = null;
      }
    })();

    queueFetchInFlight.current = pending;
    return pending;
  }, [desiredQueueSize, lastTrackId, target]);

  const ensurePrefetched = useCallback(async () => {
    if (!target) return;
    if (queueRef.current.length >= desiredQueueSize) return;
    const newTracks = await fetchBatch();
    const deduped = newTracks.filter(
      (track) => !queueRef.current.some((existing) => existing.id === track.id),
    );
    if (deduped.length) {
      const updated = [...queueRef.current, ...deduped];
      queueRef.current = updated;
      setQueue(updated);
    }
  }, [desiredQueueSize, fetchBatch, target]);

  const clearPauseTimeout = useCallback(() => {
    if (pauseTimeoutRef.current !== null) {
      window.clearTimeout(pauseTimeoutRef.current);
      pauseTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => () => clearPauseTimeout(), [clearPauseTimeout]);

  useEffect(() => {
    if (ready) {
      void ensureActivated();
    }
  }, [ensureActivated, ready]);

  useEffect(() => {
    queueRef.current = [];
    setQueue([]);
    setCurrent(null);
    setLastTrackId(null);
    queueFetchInFlight.current = null;
    if (target) {
      void ensurePrefetched();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  useEffect(() => {
    if (target && queue.length < desiredQueueSize - 1) {
      void ensurePrefetched();
    }
  }, [desiredQueueSize, ensurePrefetched, queue.length, target]);

  async function loadRandom() {
    if (!target) return;
    clearPauseTimeout();
    setRevealed(false);
    setExtended(false);
    setGuessArtist("");
    setGuessSong("");
    setResult(null);
    if (queueRef.current.length === 0) {
      await ensurePrefetched();
    }

    let workingQueue = queueRef.current;
    if (workingQueue.length === 0) {
      setCurrent(null);
      return;
    }

    let selectedIndex = workingQueue.findIndex((track) => track.id !== lastTrackId);
    if (selectedIndex === -1) selectedIndex = 0;
    const nextTrack = workingQueue[selectedIndex] ?? null;
    if (!nextTrack) {
      setCurrent(null);
      return;
    }

    const remaining = [
      ...workingQueue.slice(0, selectedIndex),
      ...workingQueue.slice(selectedIndex + 1),
    ];
    queueRef.current = remaining;
    setQueue(remaining);

    setCurrent(nextTrack);
    if (nextTrack.id) setLastTrackId(nextTrack.id);

    if (queueRef.current.length < desiredQueueSize - 1) {
      void ensurePrefetched();
    }
  }

  async function playInitial() {
    if (!current?.uri || !ready) return;
    await ensureActivated();
    await playUriAt(current.uri, 0);
    await resumePlayback();
    clearPauseTimeout();
    await waitForPlaybackStart();
    pauseTimeoutRef.current = window.setTimeout(() => {
      pausePlayback();
      pauseTimeoutRef.current = null;
    }, 1000);
  }

  async function extendFive() {
    if (!current?.uri || !ready) return;
    await ensureActivated();
    await resumePlayback();
    clearPauseTimeout();
    await waitForPlaybackStart();
    setExtended(true);
    pauseTimeoutRef.current = window.setTimeout(() => {
      pausePlayback();
      pauseTimeoutRef.current = null;
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

      <div className="rounded border border-gray-700 bg-gray-800 p-4 space-y-4">
        <h3 className="font-semibold">Pick an artist, genre, or playlist (paste a link)</h3>
        <SearchBox onPick={setTarget} />
      </div>

      {target && (
        <div className="rounded border border-gray-700 bg-gray-800 p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-gray-300">
                Round for: <b>{players[turnIndex]}</b>
              </div>
              <div className="text-xs">
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
              <button className="rounded border border-gray-600 px-3 py-1 text-gray-100" onClick={loadRandom}>
                New random
              </button>
              <button
                className="rounded bg-emerald-600 text-white px-3 py-1"
                onClick={playInitial}
                disabled={!current?.uri || !ready}
              >
                Play 1s
              </button>
              <button
                className="rounded bg-gray-700 text-white px-3 py-1"
                onClick={extendFive}
                disabled={!current?.uri || !ready || extended}
              >
                I don’t know (+5s)
              </button>
            </div>
          </div>

          {!current && <div className="text-sm text-gray-400">No track found. Try again.</div>}

          {current && (
            <>
              <div className="flex items-center gap-3">
                {current.artwork && <img src={current.artwork} alt="" className="h-16 w-16 rounded" />}
                <div className="text-sm text-gray-300">
                  Guess the <b>artist</b> and <b>song</b> name.
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-2">
                <input
                  className="rounded border border-gray-600 bg-gray-900 px-3 py-2 text-gray-100"
                  placeholder="Artist"
                  value={guessArtist}
                  onChange={(e) => setGuessArtist(e.target.value)}
                />
                <input
                  className="rounded border border-gray-600 bg-gray-900 px-3 py-2 text-gray-100"
                  placeholder="Song"
                  value={guessSong}
                  onChange={(e) => setGuessSong(e.target.value)}
                />
              </div>

              <div className="flex gap-2">
                <button className="rounded bg-emerald-600 text-white px-4 py-2" onClick={submitGuesses}>
                  Submit guess
                </button>

                {revealed && (
                  <button
                    className="rounded border border-gray-600 px-3 py-2 text-gray-100"
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
                  <a className="ml-auto text-sm text-emerald-400 underline" href={current.external_url} target="_blank">
                    Open in Spotify
                  </a>
                )}
              </div>

              {/* Wrong banner */}
              {revealed && result === "wrong" && (
                <div className="rounded border border-red-700 bg-red-900 p-3 text-red-100">
                  <div className="font-semibold">WRONG</div>
                </div>
              )}

              {/* Always show the answer once revealed */}
              {revealed && (
                <div className="rounded bg-emerald-900 border border-emerald-700 p-3 text-emerald-100">
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
