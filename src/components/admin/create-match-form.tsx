"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { MATCH_FORMATS, type MatchFormat } from "@/lib/betting/match-format";

const MATCH_FORMAT_LABEL: Record<MatchFormat, string> = {
  iidx_standard: "IIDX（2曲勝負）",
  ddr_single: "DDRシングル",
  ddr_tag: "DDRタッグ",
  sdvx_tag: "SDVXタッグ",
  sdvx_single: "SDVXシングル（3曲）",
  sdvx_megamix: "SDVXメガミックス（1st match）",
};

interface Team {
  id: string;
  name: string;
  game_title: string;
}

export function CreateMatchForm({ teams }: { teams: Team[] }) {
  const router = useRouter();
  const [matchFormat, setMatchFormat] = useState<MatchFormat>("iidx_standard");
  const [teamAId, setTeamAId] = useState("");
  const [teamBId, setTeamBId] = useState("");
  const [startTime, setStartTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsPending(true);
    try {
      const res = await fetch("/api/admin/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchFormat,
          teamAId,
          teamBId,
          startTime: new Date(startTime).toISOString(),
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "試合の作成に失敗しました");
        return;
      }
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-w-md flex-col gap-3">
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">対戦形式</span>
        <select
          value={matchFormat}
          onChange={(e) => setMatchFormat(e.target.value as MatchFormat)}
          className="input-base"
        >
          {MATCH_FORMATS.map((format) => (
            <option key={format} value={format}>
              {MATCH_FORMAT_LABEL[format]}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">Aチーム</span>
        <select
          value={teamAId}
          onChange={(e) => setTeamAId(e.target.value)}
          required
          className="input-base"
        >
          <option value="">選択してください</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}（{team.game_title}）
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">Bチーム</span>
        <select
          value={teamBId}
          onChange={(e) => setTeamBId(e.target.value)}
          required
          className="input-base"
        >
          <option value="">選択してください</option>
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}（{team.game_title}）
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-sm text-muted">開始日時</span>
        <input
          type="datetime-local"
          value={startTime}
          onChange={(e) => setStartTime(e.target.value)}
          required
          className="input-base"
        />
      </label>
      {error && <p className="text-sm text-danger">{error}</p>}
      <button type="submit" disabled={isPending} className="btn-primary">
        試合を作成
      </button>
    </form>
  );
}
