"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { StatusBadge } from "@/components/status-badge";
import type { SongStatus } from "@/types/database";

export function SongRealtimeStatus({
  songId,
  initialStatus,
}: {
  songId: string;
  initialStatus: SongStatus;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<SongStatus>(initialStatus);

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`song-status-${songId}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "tag_battle_songs",
          filter: `id=eq.${songId}`,
        },
        (payload) => {
          const newStatus = (payload.new as { status: SongStatus }).status;
          setStatus(newStatus);
          router.refresh();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [songId, router]);

  return (
    <div className="flex items-center gap-2 text-sm text-muted">
      状態: <StatusBadge status={status} />
    </div>
  );
}
