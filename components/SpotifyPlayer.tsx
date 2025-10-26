"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";

const SDK_PAUSE_TIMEOUT_MS = 4000;

declare global {
  interface Window { onSpotifyWebPlaybackSDKReady?: () => void; Spotify?: any; }
}

export default function useSpotifyDevice() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const playerRef = useRef<any>(null);
  const playbackStartResolvers = useRef<Array<() => void>>([]);
  const rememberedVolumeRef = useRef(0.8);
  const mutedRef = useRef(false);
  const tokenStateRef = useRef<{ accessToken: string; expiresAtMs: number } | null>(null);
  const inflightTokenRef = useRef<Promise<string> | null>(null);

  const invalidateToken = useCallback(() => {
    tokenStateRef.current = null;
  }, []);

  const getToken = useCallback(async (): Promise<string> => {
    const now = Date.now();
    const cached = tokenStateRef.current;
    if (cached && cached.expiresAtMs - now > 60_000) {
      return cached.accessToken;
    }

    if (!inflightTokenRef.current) {
      inflightTokenRef.current = (async () => {
        const r = await fetch("/api/auth/token", { cache: "no-store" });
        if (!r.ok) {
          inflightTokenRef.current = null;
          throw new Error("no token");
        }
        const { access_token, expires_at } = await r.json();
        const expiresAtMs = typeof expires_at === "number" ? expires_at * 1000 : now + 300_000;
        tokenStateRef.current = { accessToken: access_token, expiresAtMs };
        inflightTokenRef.current = null;
        return access_token;
      })().catch((error) => {
        inflightTokenRef.current = null;
        throw error;
      });
    }

    return inflightTokenRef.current;
  }, []);

  const fetchSpotify = useCallback(
    async (input: string, init: RequestInit = {}, retry = true): Promise<Response> => {
      const token = await getToken();
      const headers = new Headers(init.headers ?? {});
      headers.set("Authorization", `Bearer ${token}`);
      const finalInit: RequestInit = { ...init, headers };

      try {
        const response = await fetch(input, finalInit);
        if ((response.status === 401 || response.status === 403) && retry) {
          invalidateToken();
          return fetchSpotify(input, init, false);
        }
        return response;
      } catch (error) {
        if (retry) {
          invalidateToken();
        }
        throw error;
      }
    },
    [getToken, invalidateToken]
  );

  const callSpotifyJson = useCallback(
    async (input: string, body: Record<string, unknown> | null, fallback: () => Promise<void>) => {
      try {
        const response = await fetchSpotify(input, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: body ? JSON.stringify(body) : undefined,
        });
        if (!response.ok && response.status !== 204) {
          throw new Error(`Spotify request failed with status ${response.status}`);
        }
      } catch (error) {
        console.warn("Spotify Web API request failed, falling back to Next.js API", error);
        await fallback();
      }
    },
    [fetchSpotify]
  );

  const callSpotifyPause = useCallback(
    async (device_id: string | undefined, fallback: () => Promise<void>) => {
      try {
        const url = new URL("https://api.spotify.com/v1/me/player/pause");
        if (device_id) {
          url.searchParams.set("device_id", device_id);
        }
        const response = await fetchSpotify(url.toString(), { method: "PUT" });
        if (!response.ok && response.status !== 204) {
          throw new Error(`Spotify pause failed with status ${response.status}`);
        }
      } catch (error) {
        console.warn("Spotify pause via Web API failed, falling back to Next.js API", error);
        await fallback();
      }
    },
    [fetchSpotify]
  );

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

      try {
        await player.setVolume(rememberedVolumeRef.current);
      } catch (error) {
        console.warn("Unable to initialize Spotify player volume", error);
      }

      player.addListener("ready", async ({ device_id }: { device_id: string }) => {
        setDeviceId(device_id);
        setReady(true);
        await callSpotifyJson(
          "https://api.spotify.com/v1/me/player",
          { device_ids: [device_id], play: false },
          async () => {
            await fetch("/api/transfer", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ device_id })
            });
          }
        );
      });

      player.addListener("not_ready", () => setReady(false));
      player.addListener("initialization_error", ({ message }: any) => console.error(message));
      player.addListener("authentication_error", ({ message }: any) => console.error(message));
      player.addListener("account_error", ({ message }: any) => console.error(message));

      player.addListener("player_state_changed", (state: { paused: boolean } | null) => {
        if (!state) return;
        if (state.paused === false) {
          playbackStartResolvers.current.forEach((resolve) => resolve());
          playbackStartResolvers.current = [];
        }
      });

      await player.connect();
    };

    return () => {
      playbackStartResolvers.current.forEach((resolve) => resolve());
      playbackStartResolvers.current = [];
      playerRef.current?.disconnect?.();
    };
  }, [getToken]);

  const waitForPlaybackStart = useCallback(async () => {
    const player = playerRef.current;
    if (!player) return;

    const state = await player.getCurrentState?.();
    if (state && state.paused === false) {
      return;
    }

    await new Promise<void>((resolve) => {
      playbackStartResolvers.current.push(resolve);
    });
  }, []);

  const restoreVolume = useCallback(async () => {
    if (!mutedRef.current) return;
    const player = playerRef.current;
    if (!player?.setVolume) {
      mutedRef.current = false;
      return;
    }

    try {
      await player.setVolume(rememberedVolumeRef.current);
      mutedRef.current = false;
    } catch (error) {
      console.warn("Spotify Web Playback SDK failed to restore volume", error);
    }
  }, []);

  const playUriAt = useCallback(async (uri: string, position_ms: number) => {
    if (!deviceId) return;

    await restoreVolume();
    const url = new URL("https://api.spotify.com/v1/me/player/play");
    url.searchParams.set("device_id", deviceId);
    await callSpotifyJson(
      url.toString(),
      { uris: [uri], position_ms },
      async () => {
        await fetch("/api/play", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_id: deviceId, uri, position_ms })
        });
      }
    );
  }, [callSpotifyJson, deviceId, restoreVolume]);

  const resume = useCallback(async () => {
    const player = playerRef.current;

    await restoreVolume();

    if (player?.resume) {
      try {
        await player.resume();
        return;
      } catch (error) {
        console.warn("Spotify Web Playback SDK resume failed, falling back to API", error);
      }
    }

    if (!deviceId) return;
    const url = new URL("https://api.spotify.com/v1/me/player/play");
    url.searchParams.set("device_id", deviceId);
    await callSpotifyJson(
      url.toString(),
      {},
      async () => {
        await fetch("/api/play", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ device_id: deviceId })
        });
      }
    );
  }, [callSpotifyJson, deviceId, restoreVolume]);

  const pause = useCallback(async () => {
    const player = playerRef.current;

    const muteForPause = async () => {
      if (!player?.setVolume) return;
      try {
        if (player.getVolume) {
          const currentVolume = await player.getVolume();
          if (typeof currentVolume === "number") {
            rememberedVolumeRef.current = currentVolume;
          }
        }
        await player.setVolume(0);
        mutedRef.current = true;
      } catch (error) {
        console.warn("Spotify Web Playback SDK failed to mute before pause", error);
      }
    };

    const volumePromise = muteForPause();

    let sdkPauseSucceeded = false;
    let lastError: unknown = null;

    if (player?.pause) {
      const deadline = performance.now() + SDK_PAUSE_TIMEOUT_MS;

      while (performance.now() < deadline) {
        try {
          await player.pause();
        } catch (error) {
          lastError = error;
        }

        const state = await player.getCurrentState?.();
        if (!state || state.paused) {
          sdkPauseSucceeded = true;
          break;
        }

        await new Promise((resolve) => window.setTimeout(resolve, 60));
      }

      if (!sdkPauseSucceeded) {
        console.warn("Spotify Web Playback SDK pause timed out, falling back to API", lastError);
      }
    }

    if (sdkPauseSucceeded) {
      await volumePromise;
      return;
    }

    if (!deviceId) {
      await volumePromise;
      return;
    }

    await callSpotifyPause(deviceId, async () => {
      await fetch("/api/pause", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ device_id: deviceId })
      });
    });

    await volumePromise;
  }, [callSpotifyPause, deviceId]);

  const activate = useCallback(async () => {
    await playerRef.current?.activateElement?.();
  }, []);

  return { deviceId, ready, playUriAt, resume, pause, activate, waitForPlaybackStart };
}
