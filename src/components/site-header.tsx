import Link from "next/link";
import { getCurrentUser } from "@/lib/auth/get-current-user";
import { MobileNav } from "@/components/mobile-nav";
import { LogoutButton } from "@/components/logout-button";

const NAV_LINKS = [
  { href: "/matches", label: "試合一覧" },
  { href: "/teams", label: "チーム一覧" },
  { href: "/players", label: "選手一覧" },
];

export async function SiteHeader() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-md relative">
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="glow-text text-lg font-extrabold tracking-wide text-foreground"
        >
          BPエール
        </Link>

        <nav className="hidden items-center gap-6 text-sm font-medium text-muted md:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-accent-cyan"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {user ? (
            <>
              <span className="text-sm text-muted">
                <span className="font-semibold text-foreground">
                  {user.coins}
                </span>{" "}
                EC
              </span>
              <Link href="/mypage" className="btn-secondary text-sm">
                マイページ
              </Link>
              <LogoutButton />
            </>
          ) : (
            <>
              <Link href="/login" className="btn-secondary text-sm">
                ログイン
              </Link>
              <Link href="/register" className="btn-primary text-sm">
                新規登録
              </Link>
            </>
          )}
        </div>

        <MobileNav
          navLinks={NAV_LINKS}
          isLoggedIn={!!user}
          coins={user?.coins}
        />
      </div>
    </header>
  );
}
