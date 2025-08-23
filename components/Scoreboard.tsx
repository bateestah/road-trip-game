"use client";
import React from "react";

export default function Scoreboard({
  players, scores, currentIndex
}: { players: string[]; scores: number[]; currentIndex: number; }) {
  return (
    <div className="rounded border border-gray-700 bg-gray-800">
      <div className="grid grid-cols-2 sm:grid-cols-4">
        {players.map((p, i) => (
          <div
            key={i}
            className={`p-3 border-r border-gray-700 last:border-r-0 ${i === currentIndex ? "bg-amber-900 text-amber-200" : ""}`}
          >
            <div className="text-xs uppercase tracking-wide">{p}</div>
            <div className="text-2xl font-bold">{scores[i] ?? 0}</div>
            {i === currentIndex && <div className="text-xs text-amber-400">Your turn</div>}
          </div>
        ))}
      </div>
    </div>
  );
}
