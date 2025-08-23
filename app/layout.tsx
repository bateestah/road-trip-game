import "./globals.css";
import React from "react";
import ServiceWorker from "../components/ServiceWorker";

export const metadata = {
  title: "The road-trip song game",
  description: "Guess the song from short snippets. Spotify login required (Premium for playback).",
  manifest: "/manifest.json",
  icons: {
    icon: "/roadtripicon.png",
    apple: "/roadtripicon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black",
    title: "The road-trip song game",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark h-full">
      <body className="min-h-full bg-gray-900 text-gray-100">
        <header className="border-b border-gray-700 bg-gray-800">
          <div className="mx-auto max-w-4xl p-4 flex items-center justify-between">
            <h1 className="text-xl font-bold">The road-trip song game</h1>
            <a className="text-sm text-emerald-400 underline" href="/api/auth/login">Sign in with Spotify</a>
          </div>
        </header>
        <main className="mx-auto max-w-4xl p-4">{children}</main>
        <ServiceWorker />
      </body>
    </html>
  );
}
