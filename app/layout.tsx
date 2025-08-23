import "./globals.css";
import React from "react";

export const metadata = {
  title: "The road-trip song game",
  description: "Guess the song from short snippets. Spotify login required (Premium for playback)."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full bg-slate-50">
      <body className="min-h-full text-slate-900">
        <header className="border-b bg-white">
          <div className="mx-auto max-w-4xl p-4 flex items-center justify-between">
            <h1 className="text-xl font-bold">The road‑trip song game</h1>
            <a className="text-sm underline" href="/api/auth/login">Sign in with Spotify</a>
          </div>
        </header>
        <main className="mx-auto max-w-4xl p-4">{children}</main>
      </body>
    </html>
  );
}
