import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { UserAdminToggle } from "@/components/admin/user-admin-toggle";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <main className="flex flex-1 items-center justify-center p-8">
        <p className="text-muted">管理者権限が必要です。</p>
      </main>
    );
  }

  const supabase = createServiceClient();
  const { data: users } = await supabase
    .from("users")
    .select("id, login_id, coins, is_admin, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-10 sm:px-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="glow-text text-xl font-bold text-foreground sm:text-2xl">
          ユーザー管理
        </h1>
        <Link href="/admin" className="text-sm text-accent-cyan underline">
          管理トップへ戻る
        </Link>
      </div>

      <section className="card-surface p-5 sm:p-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-sm">
            <thead>
              <tr className="text-left text-muted">
                <th className="pb-2 font-medium">ログインID</th>
                <th className="pb-2 font-medium">EC</th>
                <th className="pb-2 font-medium">管理者</th>
                <th className="pb-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((user) => (
                <tr key={user.id} className="border-t border-border">
                  <td className="py-2 text-foreground">{user.login_id}</td>
                  <td className="py-2 text-foreground">{user.coins}</td>
                  <td className="py-2">
                    {user.is_admin ? (
                      <span className="text-accent-cyan">○</span>
                    ) : (
                      ""
                    )}
                  </td>
                  <td className="py-2">
                    <UserAdminToggle
                      userId={user.id}
                      isAdmin={user.is_admin}
                      isSelf={user.id === admin.userId}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {(users ?? []).length === 0 && (
          <p className="text-sm text-muted">ユーザーがまだいません</p>
        )}
      </section>
    </main>
  );
}
