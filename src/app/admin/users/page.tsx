import Link from "next/link";
import { requireAdmin } from "@/lib/auth/require-admin";
import { createServiceClient } from "@/lib/supabase/service";
import { UserAdminToggle } from "@/components/admin/user-admin-toggle";

export default async function AdminUsersPage() {
  const admin = await requireAdmin();
  if (!admin) {
    return (
      <main className="flex-1 flex items-center justify-center p-8">
        <p>管理者権限が必要です。</p>
      </main>
    );
  }

  const supabase = createServiceClient();
  const { data: users } = await supabase
    .from("users")
    .select("id, login_id, coins, is_admin, created_at")
    .order("created_at", { ascending: false });

  return (
    <main className="flex-1 p-8 max-w-2xl mx-auto w-full flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">ユーザー管理</h1>
        <Link href="/admin" className="text-sm underline">
          管理トップへ戻る
        </Link>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500">
            <th className="pb-1">ログインID</th>
            <th className="pb-1">EC</th>
            <th className="pb-1">管理者</th>
            <th className="pb-1"></th>
          </tr>
        </thead>
        <tbody>
          {(users ?? []).map((user) => (
            <tr key={user.id} className="border-t">
              <td className="py-1">{user.login_id}</td>
              <td className="py-1">{user.coins}</td>
              <td className="py-1">{user.is_admin ? "○" : ""}</td>
              <td className="py-1">
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
      {(users ?? []).length === 0 && (
        <p className="text-sm text-gray-400">ユーザーがまだいません</p>
      )}
    </main>
  );
}
