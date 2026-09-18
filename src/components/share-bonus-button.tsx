"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const SHARE_TEXT = "BPエールでBEMANI PRO LEAGUEの選手にエールを送ってます！";

export function ShareBonusButton({ available }: { available: boolean }) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleShare() {
    const intentUrl = new URL("https://twitter.com/intent/tweet");
    intentUrl.searchParams.set("text", SHARE_TEXT);
    intentUrl.searchParams.set("url", window.location.origin);
    window.open(intentUrl.toString(), "_blank", "noopener,noreferrer");

    setIsPending(true);
    try {
      const res = await fetch("/api/share-bonus", { method: "POST" });
      const data = (await res.json()) as { error?: string; coins?: number };
      if (!res.ok) {
        setMessage(data.error ?? "ボーナスの受け取りに失敗しました");
        return;
      }
      setMessage(`+10エールコイン獲得しました（残高${data.coins} EC）`);
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  if (!available) {
    return (
      <p className="text-xs text-gray-400">
        本日分のXシェアボーナスは受け取り済みです
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={handleShare}
        disabled={isPending}
        className="rounded border border-black px-4 py-2 disabled:opacity-50"
      >
        Xでシェアしてボーナスをもらう
      </button>
      {message && <p className="text-xs text-gray-500">{message}</p>}
    </div>
  );
}
