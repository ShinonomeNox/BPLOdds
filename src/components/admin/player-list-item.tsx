"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

interface Team {
  id: string;
  name: string;
  game_title: string;
}

interface Player {
  id: string;
  name: string;
  game_title: string;
  team_id: string;
}

export function PlayerListItem({
  player,
  teams,
  teamName,
}: {
  player: Player;
  teams: Team[];
  teamName: string;
}) {
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(player.name);
  const [teamId, setTeamId] = useState(player.team_id);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSave() {
    setError(null);
    setIsPending(true);
    try {
      const res = await fetch(`/api/admin/players/${player.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, teamId }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "更新に失敗しました");
        return;
      }
      setIsEditing(false);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete() {
    if (!confirm(`「${player.name}」を削除しますか？`)) {
      return;
    }
    setError(null);
    setIsPending(true);
    try {
      const res = await fetch(`/api/admin/players/${player.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "削除に失敗しました");
        return;
      }
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  if (isEditing) {
    return (
      <li className="flex flex-col gap-2 rounded-lg border border-border p-2">
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-base py-1 text-sm"
          />
          <select
            value={teamId}
            onChange={(e) => setTeamId(e.target.value)}
            className="input-base py-1 text-sm"
          >
            {teams.map((team) => (
              <option key={team.id} value={team.id}>
                {team.name}（{team.game_title.toUpperCase()}）
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="btn-primary text-xs"
          >
            保存
          </button>
          <button
            type="button"
            onClick={() => setIsEditing(false)}
            className="btn-secondary text-xs"
          >
            キャンセル
          </button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
      </li>
    );
  }

  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <span>
        {player.name} — {teamName}（{player.game_title.toUpperCase()}）
      </span>
      <span className="flex gap-2">
        <button
          type="button"
          onClick={() => setIsEditing(true)}
          className="text-xs text-accent-cyan underline"
        >
          編集
        </button>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="text-xs text-danger underline disabled:opacity-50"
        >
          削除
        </button>
      </span>
    </li>
  );
}
