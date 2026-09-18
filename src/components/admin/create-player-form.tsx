"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

interface Team {
  id: string;
  name: string;
  game_title: string;
}

export function CreatePlayerForm({ teams }: { teams: Team[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [teamId, setTeamId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const res = await fetch("/api/admin/players", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, teamId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "選手の作成に失敗しました");
        return;
      }
      setName("");
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
      <label className="flex flex-col gap-1">
        <span className="text-sm">選手名</span>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="rounded border px-3 py-2"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm">所属チーム</span>
        <select
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
          required
          className="rounded border px-3 py-2"
        >
          <option value="">選択してください</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}（{team.game_title.toUpperCase()}）
            </option>
          ))}
        </select>
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="self-start rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
      >
        選手を作成
      </button>
    </form>
  );
}
