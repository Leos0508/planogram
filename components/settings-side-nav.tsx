"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const settingsNav = [
  { label: "Workspace", href: "/settings", exact: true },
  { label: "Members", href: "/settings/members", exact: false },
  { label: "Account", href: "/settings/account", exact: false },
] as const;

export function SettingsSideNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {settingsNav.map((item) => {
        const active = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "px-3 py-2 text-sm",
              active ? "bg-muted font-medium" : "hover:bg-muted",
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
