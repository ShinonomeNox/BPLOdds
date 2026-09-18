import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { CreateSongForm } from "@/components/admin/create-song-form";

export default async function AdminSongsPage() {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <p>管理者権限が必要です。</p>
      </main>
    );
  }

  const supabase = createServiceClient();
  const { data: songs } = await supabase
    .from("songs")
    .select("id, game_title, name, theme, level")
    .order("name");

  return (
    <main className="flex-1 p-8 max-w-2xl mx-auto w-full flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">課題曲マスタ管理</h1>
        <Link href="/admin" className="text-sm underline">
          管理トップへ戻る
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="font-semibold">新規作成</h2>
        <CreateSongForm />
      </section>

      <section className="flex flex-col gap-2">
        <h2 className="font-semibold">一覧</h2>
        <ul className="flex flex-col gap-1 text-sm">
          {(songs ?? []).map((song) => (
            <li key={song.id}>
              [{song.game_title.toUpperCase()}] {song.name}
              {song.theme && ` / ${song.theme}`}
              {song.level !== null && ` / Lv.${song.level}`}
            </li>
          ))}
          {(songs ?? []).length === 0 && (
            <p className="text-gray-400">課題曲がまだありません</p>
          )}
        </ul>
      </section>
    </main>
  );
}
