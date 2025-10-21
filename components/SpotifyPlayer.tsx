"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window { onSpotifyWebPlaybackSDKReady?: () => void; Spotify?: any; }
}

export default function useSpotifyDevice() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const playerRef = useRef<any>(null);
  type PlaybackStartResolver = {
    resolve: () => void;
    predicate?: (state: any) => boolean;
    cleanup?: () => void;
  };
  const playbackStartResolvers = useRef<PlaybackStartResolver[]>([]);
  const lastPlayerStateRef = useRef<any>(null);
  const stateChangeListenerRef = useRef<((state: any) => void) | null>(null);

  const getToken = useCallback(async (): Promise<string> => {
    const r = await fetch("/api/auth/token", { cache: "no-store" });
    if (!r.ok) throw new Error("no token");
    const { access_token } = await r.json();
    return access_token;
    }, []);

  useEffect(() => {
    const id = "spotify-player";
    if (!document.getElementById(id)) {
      const s = document.createElement("script");
      s.id = id;
      s.src = "https://sdk.scdn.co/spotify-player.js";
      s.async = true;
      document.body.appendChild(s);
    }

    window.onSpotifyWebPlaybackSDKReady = async () => {
      const token = await getToken();
      const player = new window.Spotify.Player({
        name: "The road-trip song game",
        getOAuthToken: async (cb: (t: string)=>void) => cb(await getToken()),
        volume: 0.8
      });
      playerRef.current = player;

      const handleStateChange = (state: any) => {
        lastPlayerStateRef.current = state;
        if (state && state.paused === false && playbackStartResolvers.current.length) {
          const remaining: PlaybackStartResolver[] = [];
          playbackStartResolvers.current.forEach((entry) => {
            if (!entry.predicate || entry.predicate(state)) {
              entry.resolve();
            } else {
              remaining.push(entry);
            }
          });
          playbackStartResolvers.current = remaining;
        }
      };
      stateChangeListenerRef.current = handleStateChange;

      player.addListener("ready", ({ device_id }: { device_id: string }) => {
        setDeviceId(device_id);
        setReady(true);
        fetch("/api/transfer", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_id })
        });
      });

      player.addListener("not_ready", () => setReady(false));
      player.addListener("initialization_error", ({ message }: any) => console.error(message));
      player.addListener("authentication_error", ({ message }: any) => console.error(message));
      player.addListener("account_error", ({ message }: any) => console.error(message));
      player.addListener("player_state_changed", handleStateChange);

      await player.connect();
    };

    return () => {
      playbackStartResolvers.current.forEach((entry) => entry.cleanup?.());
      playbackStartResolvers.current = [];
      if (stateChangeListenerRef.current) {
        playerRef.current?.removeListener("player_state_changed", stateChangeListenerRef.current);
        stateChangeListenerRef.current = null;
      }
      playerRef.current?.disconnect?.();
    };
  }, [getToken]);

  const playUriAt = useCallback(async (uri: string, position_ms: number) => {
    if (!deviceId) return;
    await fetch("/api/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId, uri, position_ms })
    });
  }, [deviceId]);

  const resume = useCallback(async () => {
    if (!deviceId) return;
    await fetch("/api/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId })
    });
  }, [deviceId]);

  const pause = useCallback(async () => {
    if (!deviceId) return;
    await fetch("/api/pause", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId })
    });
  }, [deviceId]);

  const activate = useCallback(async () => {
    await playerRef.current?.activateElement?.();
  }, []);

  const waitForPlaybackStart = useCallback(
    async ({ predicate, signal }: { predicate?: (state: any) => boolean; signal?: AbortSignal } = {}) => {
      return new Promise<void>((resolve, reject) => {
        const entry: PlaybackStartResolver = { resolve: () => {}, predicate };

        const cleanup = () => {
          playbackStartResolvers.current = playbackStartResolvers.current.filter((item) => item !== entry);
          if (signal) {
            signal.removeEventListener("abort", onAbort);
          }
        };

        const onAbort = () => {
          cleanup();
          const error = new Error("playback_wait_aborted");
          (error as any).name = "AbortError";
          reject(error);
        };

        entry.cleanup = cleanup;
        entry.resolve = () => {
          cleanup();
          resolve();
        };

        if (signal?.aborted) {
          onAbort();
          return;
        }

        const lastState = lastPlayerStateRef.current;
        if (lastState && lastState.paused === false && (!predicate || predicate(lastState))) {
          entry.resolve();
          return;
        }

        playbackStartResolvers.current.push(entry);

        if (signal) {
          signal.addEventListener("abort", onAbort);
        }
      });
    },
    []
  );

  return { deviceId, ready, playUriAt, resume, pause, activate, waitForPlaybackStart };
}
