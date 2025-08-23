import Link from "next/link";

export default function Home() {
  return (
    <div className="space-y-6">
      <p className="text-lg">
        Sign in with your Spotify account, pick an artist, genre, or playlist link, and guess the song.
      </p>
      <ul className="list-disc pl-5 space-y-2">
        <li>Round starts with a 1‑second clip (from the song start).</li>
        <li>Tap “I don’t know” to reveal +5 seconds.</li>
        <li>1–4 players. Points: 1 for artist, 1 for song.</li>
      </ul>
      <Link href="/game" className="inline-block rounded bg-black text-white px-4 py-2">
        Start playing
      </Link>
    </div>
  );
}
