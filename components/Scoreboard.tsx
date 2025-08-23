"use client";
import React from "react";

export default function Scoreboard({
  players, scores, currentIndex
}: { players: string[]; scores: number[]; currentIndex: number; }) {
  return (
    <div className="rounded border bg-white dark:bg-slate-800 dark:border-slate-700">
      <div className="grid grid-cols-2 sm:grid-cols-4">
        {players.map((p, i) => (
          <div
            key={i}
            className={`p-3 border-r last:border-r-0 dark:border-slate-700 ${
              i === currentIndex ? "bg-amber-50 dark:bg-amber-900" : ""
            }`}
          >
            <div className="text-xs uppercase tracking-wide">{p}</div>
            <div className="text-2xl font-bold">{scores[i] ?? 0}</div>
            {i === currentIndex && (
              <div className="text-xs text-amber-700 dark:text-amber-300">Your turn</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
