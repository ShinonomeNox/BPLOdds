"use client";

import Link from "next/link";
import { useState } from "react";
import { LogoutButton } from "@/components/logout-button";

interface NavLink {
  href: string;
  label: string;
}

export function MobileNav({
  navLinks,
  isLoggedIn,
  coins,
}: {
  navLinks: NavLink[];
  isLoggedIn: boolean;
  coins?: number;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="メニュー"
        className="flex h-9 w-9 items-center justify-center rounded-md border border-border text-foreground"
      >
        {isOpen ? "✕" : "☰"}
      </button>

      {isOpen && (
        <div className="absolute inset-x-0 top-16 border-b border-border bg-background-elevated px-4 py-4 shadow-xl">
          <nav className="flex flex-col gap-3 text-sm font-medium text-muted">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsOpen(false)}
                className="transition-colors hover:text-accent-cyan"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
            {isLoggedIn ? (
              <>
                <p className="text-sm text-muted">
                  <span className="font-semibold text-foreground">
                    {coins}
                  </span>{" "}
                  EC
                </p>
                <Link
                  href="/mypage"
                  onClick={() => setIsOpen(false)}
                  className="btn-secondary text-center text-sm"
                >
                  マイページ
                </Link>
                <LogoutButton />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setIsOpen(false)}
                  className="btn-secondary text-center text-sm"
                >
                  ログイン
                </Link>
                <Link
                  href="/register"
                  onClick={() => setIsOpen(false)}
                  className="btn-primary text-center text-sm"
                >
                  新規登録
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
