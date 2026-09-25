"use client";

import { useRouter } from "next/navigation";

export function BackButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={() => router.back()}
      className="mb-4 flex items-center gap-1 text-sm text-muted transition-colors hover:text-accent-cyan"
    >
      ← 戻る
    </button>
  );
}
