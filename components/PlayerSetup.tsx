"use client";
import React, { useState } from "react";

export default function PlayerSetup({ onStart }: { onStart: (players: string[]) => void }) {
  const [count, setCount] = useState(2);
  const [names, setNames] = useState<string[]>(["Player 1", "Player 2"]);

  const updateCount = (c: number) => {
    const next = Math.max(1, Math.min(4, c));
    setCount(next);
    setNames((prev) => {
      const arr = [...prev];
      while (arr.length < next) arr.push(`Player ${arr.length + 1}`);
      return arr.slice(0, next);
    });
  };

  return (
    <div className="space-y-4">
      <h2 className="font-semibold text-lg">Players</h2>
      <label className="block">
        <span className="text-sm">Number of players (1–4)</span>
        <input
          type="number"
          min={1}
          max={4}
          value={count}
          onChange={(e) => updateCount(parseInt(e.target.value))}
          className="mt-1 w-28 rounded border border-gray-600 bg-gray-900 px-2 py-1 text-gray-100"
        />
      </label>
      <div className="grid gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <input
            key={i}
            className="rounded border border-gray-600 bg-gray-900 px-2 py-1 text-gray-100"
            value={names[i]}
            onChange={(e) => {
              const v = e.target.value || `Player ${i + 1}`;
              setNames((prev) => prev.map((p, idx) => (idx === i ? v : p)));
            }}
          />
        ))}
      </div>
      <button onClick={() => onStart(names)} className="rounded bg-gray-700 text-white px-4 py-2">
        Start game
      </button>
    </div>
  );
}
