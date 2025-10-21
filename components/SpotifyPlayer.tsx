"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

declare global {
  interface Window { onSpotifyWebPlaybackSDKReady?: () => void; Spotify?: any; }
}

export default function useSpotifyDevice() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const playerRef = useRef<any>(null);
  type PlaybackStartResolver = { resolve: () => void; uri?: string | null };
  const playbackStartResolvers = useRef<PlaybackStartResolver[]>([]);

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

      player.addListener("player_state_changed", (state: any | null) => {
        if (!state) return;
        if (state.paused === false) {
          const currentUri: string | null = state.track_window?.current_track?.uri ?? null;
          playbackStartResolvers.current = playbackStartResolvers.current.filter(({ resolve, uri }) => {
            if (uri && uri !== currentUri) {
              return true;
            }
            resolve();
            return false;
          });
        }
      });

      await player.connect();
    };

    return () => {
      playbackStartResolvers.current.forEach(({ resolve }) => resolve());
      playbackStartResolvers.current = [];
      playerRef.current?.disconnect?.();
    };
  }, [getToken]);

  const waitForPlaybackStart = useCallback(async (expectedUri?: string | null) => {
    const player = playerRef.current;
    if (!player) return;

    const state = await player.getCurrentState?.();
    if (state && state.paused === false) {
      const currentUri: string | null = state.track_window?.current_track?.uri ?? null;
      if (!expectedUri || currentUri === expectedUri) {
        return;
      }
    }

    await new Promise<void>((resolve) => {
      playbackStartResolvers.current.push({ resolve, uri: expectedUri ?? null });
    });
  }, []);

  const playUriAt = useCallback(async (uri: string, position_ms: number) => {
    if (!deviceId) return;
    await fetch("/api/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId, uri, position_ms })
    });
  }, [deviceId]);

  const resume = useCallback(async () => {
    if (playerRef.current?.resume) {
      await playerRef.current.resume();
      return;
    }

    if (!deviceId) return;
    await fetch("/api/play", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ device_id: deviceId })
    });
  }, [deviceId]);

  const pause = useCallback(async () => {
    if (playerRef.current?.pause) {
      await playerRef.current.pause();
    }

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

  return { deviceId, ready, playUriAt, resume, pause, activate, waitForPlaybackStart };
}
