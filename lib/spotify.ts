import type { SpotifyToken } from "./types";
import shuffle from "lodash.shuffle";

async function sp<T>(token: SpotifyToken, path: string, params?: Record<string,string>): Promise<T> {
  const url = new URL(`https://api.spotify.com/v1/${path}`);
  if (params) Object.entries(params).forEach(([k,v]) => url.searchParams.set(k, v));
  const r = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token.access_token}` } });
  if (!r.ok) throw new Error(`Spotify error ${r.status}`);
  return r.json();
}

export async function searchArtists(token: SpotifyToken, q: string) {
  const res = await sp<any>(token, "search", { q, type: "artist", limit: "10" });
  return res.artists.items.map((a: any)=>({ id:a.id, name:a.name }));
}

export async function searchPlaylists(token: SpotifyToken, q: string) {
  const res = await sp<any>(token, "search", { q, type: "playlist", limit: "20", market: "US" });
  const items = (res.playlists?.items ?? []).filter((p: any) => p && p.id && p.name);
  return items.map((p: any) => ({ id: p.id, name: p.name }));
}

export async function getPlaylist(token: SpotifyToken, id: string) {
  const res = await sp<any>(token, `playlists/${id}`, { market: "US" });
  return { id: res.id, name: res.name };
}



export async function listGenres(token: SpotifyToken, q: string) {
  const res = await sp<any>(token, "recommendations/available-genre-seeds");
  const all: string[] = res.genres ?? [];
  const needle = q.toLowerCase();
  return all.filter(g => g.toLowerCase().includes(needle)).slice(0, 20);
}

export async function randomTracksByArtist(token: SpotifyToken, artistId: string, count = 1) {
  const [top, albums] = await Promise.all([
    sp<any>(token, `artists/${artistId}/top-tracks`, { market: "US" }),
    sp<any>(token, `artists/${artistId}/albums`, {
      include_groups: "album,single,compilation,appears_on",
      market: "US",
      limit: "10",
    }),
  ]);

  const albumIds = Array.from(new Set((albums.items ?? []).map((a: any) => a.id))).slice(0, 8);
  const albumDetails = await Promise.all(
    albumIds.map(async (id) => {
      try {
        return await sp<any>(token, `albums/${id}`, { market: "US" });
      } catch {
        return null;
      }
    })
  );

  const tracks: any[] = [...(top.tracks ?? [])];
  albumDetails
    .filter(Boolean)
    .forEach((album: any) => {
      tracks.push(...(album.tracks?.items ?? []).map((t: any) => ({ ...t, album })));
    });

  return pickPlayable(tracks, count);
}

export async function randomTracksByGenre(token: SpotifyToken, genre: string, count = 1) {
  const res = await sp<any>(token, "search", {
    q: `genre:"${genre}"`,
    type: "track",
    market: "US",
    limit: "50",
  });
  return pickPlayable(res.tracks.items, count);
}

export async function randomTracksFromPlaylist(token: SpotifyToken, playlistId: string, count = 1) {
  const res = await sp<any>(token, `playlists/${playlistId}/tracks`, { market: "US", limit: "100" });
  const tracks = res.items.map((i:any)=> i.track).filter(Boolean);
  return pickPlayable(tracks, count);
}

function pickPlayable(tracks: any[], count: number) {
  const ordered = shuffle(
    (tracks ?? []).filter((t: any) => {
      if (!t) return false;
      if (t.type !== "track") return false;
      if (!t.uri) return false;
      if (t.is_playable === false) return false;
      if (t.is_local) return false;
      return true;
    })
  );

  return ordered.slice(0, count).map((t: any) => {
    const artwork = t.album?.images?.[1]?.url ?? t.album?.images?.[0]?.url ?? null;
    return {
      id: t.id,
      uri: t.uri,
      name: t.name,
      artists: (t.artists || []).map((a:any)=>a.name),
      external_url: t.external_urls?.spotify ?? "",
      artwork
    };
  });
}

// Playback control helpers
export async function transferPlayback(token: SpotifyToken, device_id: string, play = false) {
  const r = await fetch("https://api.spotify.com/v1/me/player", {
    method: "PUT",
    headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ device_ids: [device_id], play })
  });
  if (!r.ok && r.status !== 204) throw new Error("transfer failed");
}

export async function playOnDevice(token: SpotifyToken, device_id: string, uri?: string, position_ms?: number) {
  const url = new URL(`https://api.spotify.com/v1/me/player/play`);
  url.searchParams.set("device_id", device_id);
  const body: any = {};
  if (uri) body.uris = [uri];
  if (typeof position_ms === "number") body.position_ms = position_ms;
  const r = await fetch(url.toString(), {
    method: "PUT",
    headers: { Authorization: `Bearer ${token.access_token}`, "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
  if (!r.ok && r.status !== 204) throw new Error("play failed");
}

export async function pause(token: SpotifyToken, device_id?: string) {
  const url = new URL("https://api.spotify.com/v1/me/player/pause");
  if (device_id) url.searchParams.set("device_id", device_id);
  const r = await fetch(url.toString(), { method: "PUT", headers: { Authorization: `Bearer ${token.access_token}` } });
  if (!r.ok && r.status !== 204) throw new Error("pause failed");
}
