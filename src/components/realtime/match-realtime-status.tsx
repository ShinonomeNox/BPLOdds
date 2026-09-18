"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { MatchStatus } from "@/types/database";

const STATUS_LABEL: Record<MatchStatus, string> = {
  scheduled: "受付中",
  live: "締切済み",
  settled: "終了",
};

const STATUS_COLOR: Record<MatchStatus, string> = {
  scheduled: "text-green-600",
  live: "text-red-600",
  settled: "text-gray-500",
};

export function MatchRealtimeStatus({
  matchId,
  initialStatus,
}: {
  matchId: string;
  initialStatus: MatchStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<MatchStatus>(initialStatus);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`match-status-${matchId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "matches",
          filter: `id=eq.${matchId}`,
        },
        (payload) => {
          const newStatus = (payload.new as { status: MatchStatus }).status;
          setStatus(newStatus);
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [matchId, router]);

  return (
    <p className={`text-sm font-semibold ${STATUS_COLOR[status]}`}>
      状態: {STATUS_LABEL[status]}
    </p>
  );
}
