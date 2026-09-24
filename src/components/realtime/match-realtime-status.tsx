"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/status-badge";
import type { MatchStatus } from "@/types/database";

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
    <div className="flex items-center gap-2 text-sm text-muted">
      状態: <StatusBadge status={status} />
    </div>
  );
}
