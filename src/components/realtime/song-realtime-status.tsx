"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { SongStatus } from "@/types/database";

const STATUS_LABEL: Record<SongStatus, string> = {
  open: "受付中",
  closed: "締切済み",
  settled: "終了",
};

const STATUS_COLOR: Record<SongStatus, string> = {
  open: "text-green-600",
  closed: "text-red-600",
  settled: "text-gray-500",
};

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
    <p className={`text-sm font-semibold ${STATUS_COLOR[status]}`}>
      状態: {STATUS_LABEL[status]}
    </p>
  );
}
