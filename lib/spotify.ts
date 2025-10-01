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

export async function randomTrackByArtist(token: SpotifyToken, artistId: string) {
  const top = await sp<any>(token, `artists/${artistId}/top-tracks`, { market: "US" });
  const albums = await sp<any>(token, `artists/${artistId}/albums`, { include_groups: "album,single,compilation,appears_on", market: "US", limit: "10" });

  const albumIds = Array.from(new Set(albums.items.map((a:any)=>a.id)));
  const tracks: any[] = [...(top.tracks ?? [])];
  for (const id of albumIds) {
    const a = await sp<any>(token, `albums/${id}`, { market: "US" });
    tracks.push(...(a.tracks.items ?? []).map((t:any)=>({ ...t, album: a })));
  }

  return pickAnyPlayable(tracks);
}

export async function randomTrackByGenre(token: SpotifyToken, genre: string) {
  const res = await sp<any>(token, "search", { q: `genre:"${genre}"`, type: "track", market: "US", limit: "50" });
  return pickAnyPlayable(res.tracks.items);
}

export async function randomTrackFromPlaylist(token: SpotifyToken, playlistId: string) {
  const res = await sp<any>(token, `playlists/${playlistId}/tracks`, { market: "US", limit: "100" });
  const tracks = res.items.map((i:any)=> i.track).filter(Boolean);
  return pickAnyPlayable(tracks);
}

function pickAnyPlayable(tracks: any[]) {
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
  const t = ordered[0];
  if (!t) return null;
  const artwork = t.album?.images?.[1]?.url ?? t.album?.images?.[0]?.url ?? null;
  return {
    id: t.id,
    uri: t.uri,
    name: t.name,
    artists: (t.artists || []).map((a:any)=>a.name),
    external_url: t.external_urls?.spotify ?? "",
    artwork
  };
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
