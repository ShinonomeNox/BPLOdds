import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { CreateSongForm } from "@/components/admin/create-song-form";
import { SongMasterListItem } from "@/components/admin/song-master-list-item";
import { BulkImportForm } from "@/components/admin/bulk-import-form";

export default async function AdminSongsPage() {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted">管理者権限が必要です。</p>
      </main>
    );
  }

  const supabase = createServiceClient();
  const { data: songs } = await supabase
    .from("songs")
    .select("id, game_title, name, theme, level")
    .order("name");

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="glow-text text-xl font-bold text-foreground sm:text-2xl">
          課題曲マスタ管理
        </h1>
        <Link href="/admin" className="text-sm text-accent-cyan underline">
          管理トップへ戻る
        </Link>
      </div>

      <div className="flex flex-col gap-6">
        <section className="card-surface p-5 sm:p-6">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
            新規作成
          </h2>
          <CreateSongForm />
        </section>

        <BulkImportForm
          endpoint="/api/admin/song-masters/bulk"
          helpText="1行に「機種(iidx/sdvx/ddr), 曲名, テーマ(任意), レベル(任意)」の形式で入力してください"
          placeholder={"iidx, HAERETICO, graduation, 11.5\nsdvx, 少女レイ, , 18"}
        />

        <section className="card-surface p-5 sm:p-6">
          <h2 className="mb-3 text-sm font-bold tracking-wide text-accent-purple">
            一覧
          </h2>
          <ul className="flex flex-col gap-1">
            {(songs ?? []).map((song) => (
              <SongMasterListItem key={song.id} song={song} />
            ))}
            {(songs ?? []).length === 0 && (
              <p className="text-sm text-muted">課題曲がまだありません</p>
            )}
          </ul>
        </section>
      </div>
    </main>
  );
}
