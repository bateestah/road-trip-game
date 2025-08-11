# The road-trip song game

Guess the song with Spotify (Premium). The game plays from **0s → pauses at 1s**. Tap **“I don’t know”** to resume **+5s**. Supports **1–4 players**, rotating turns, and **1 point each** for correct artist and song.

## One‑click deploy (Vercel)

> Replace `YOUR_GITHUB_REPO_URL` below with your repo URL after you push this code to GitHub.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone
?repository-url=YOUR_GITHUB_REPO_URL
&project-name=the-road-trip-song-game
&repository-name=the-road-trip-song-game
&env=SPOTIFY_CLIENT_ID,SPOTIFY_CLIENT_SECRET,NEXT_PUBLIC_APP_URL,SESSION_COOKIE_NAME,ENCRYPTION_KEY
&envDescription=Enter%20your%20Spotify%20app%20credentials%20and%20cookie%20settings
&envLink=https%3A%2F%2Fdeveloper.spotify.com%2Fdashboard
)

### Required environment variables
See `.env.example`:
```
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
NEXT_PUBLIC_APP_URL=
SESSION_COOKIE_NAME=trsg_session
ENCRYPTION_KEY=
```

> **ENCRYPTION_KEY** is used to encrypt the Spotify tokens inside an httpOnly cookie using AES‑256‑GCM. Generate one:
> - Hex (64 chars): `openssl rand -hex 32`
> - Base64 (44 chars): `openssl rand -base64 32`

## Spotify app setup
- Redirect URI (local): `http://localhost:3000/api/auth/callback`
- Redirect URI (prod): `https://YOUR_DOMAIN/api/auth/callback`
- Scopes:
  `streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state playlist-read-private playlist-read-collaborative`

## Run locally
```
cp .env.example .env.local
# fill in values
npm i
npm run dev
```

## Deploy (summary)
1. Push to GitHub.
2. Click the deploy button above and fill env vars.
3. Add the production redirect URI to your Spotify app and save.
4. Done. Enjoy!
