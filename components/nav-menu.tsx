"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { MenuIcon, XIcon } from "lucide-react";
import { signOutAction } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Planograms", href: "/planograms" },
  { label: "SKUs", href: "/skus" },
];

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function NavMenu({
  user,
}: {
  user: { name?: string | null; email?: string | null } | null;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!menuOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const userLabel = user?.name?.trim() || user?.email || "Account";

  return (
    <header className="shrink-0 border-b">
      <nav className="flex h-16 w-full items-center gap-2 px-4">
        <Link
          href="/"
          className="font-heading text-sm font-semibold tracking-tight text-foreground"
        >
          Planogram
        </Link>

        <div className="ml-4 hidden items-center gap-1 sm:flex">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Button
                key={item.href}
                variant={active ? "secondary" : "ghost"}
                size="sm"
                asChild
              >
                <Link
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </div>

        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <div className="relative" ref={menuRef}>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-expanded={menuOpen}
                aria-controls={menuId}
                onClick={() => setMenuOpen((open) => !open)}
              >
                <span className="max-w-40 truncate">{userLabel}</span>
              </Button>
              {menuOpen ? (
                <div
                  id={menuId}
                  role="menu"
                  className="absolute right-0 z-50 mt-1 min-w-44 border border-border bg-background p-1"
                >
                  <Link
                    href="/settings"
                    role="menuitem"
                    className="block px-3 py-2 text-sm hover:bg-muted"
                    onClick={() => setMenuOpen(false)}
                  >
                    Settings
                  </Link>
                  <form action={signOutAction}>
                    <button
                      type="submit"
                      role="menuitem"
                      className="w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    >
                      Sign out
                    </button>
                  </form>
                </div>
              ) : null}
            </div>
          ) : (
            <Button variant="outline" size="sm" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="sm:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((open) => !open)}
          >
            {mobileOpen ? <XIcon /> : <MenuIcon />}
          </Button>
        </div>
      </nav>

      {mobileOpen ? (
        <div className="flex flex-col gap-1 border-t p-2 sm:hidden">
          {navItems.map((item) => {
            const active = isActivePath(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "px-3 py-2 text-sm",
                  active ? "bg-muted font-medium" : "hover:bg-muted",
                )}
                onClick={() => setMobileOpen(false)}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
      ) : null}
    </header>
  );
}
