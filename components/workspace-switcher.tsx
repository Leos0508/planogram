"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsUpDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast-provider";
import { setActiveWorkspace } from "@/lib/workspaces/actions";
import type { WorkspaceMembershipListItem } from "@/lib/workspaces/list";
import { catalogPathAfterSwitch } from "@/lib/workspaces/switch-path";
import { cn } from "@/lib/utils";

export default function WorkspaceSwitcher({
  workspaces,
}: {
  workspaces: WorkspaceMembershipListItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const active =
    workspaces.find((workspace) => workspace.isActive) ?? workspaces[0];

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("mousedown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (workspaces.length === 0 || !active) {
    return null;
  }

  if (workspaces.length === 1) {
    return (
      <span
        className="hidden max-w-44 truncate text-sm text-muted-foreground sm:inline"
        title={active.name}
      >
        {active.name}
      </span>
    );
  }

  const onSelect = (workspaceId: string) => {
    if (workspaceId === active.id || pending) {
      setOpen(false);
      return;
    }

    startTransition(async () => {
      const result = await setActiveWorkspace({ workspaceId });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setOpen(false);
      const nextPath = catalogPathAfterSwitch(pathname);
      if (nextPath) {
        router.push(nextPath);
      }
      router.refresh();
    });
  };

  return (
    <div className="relative" ref={menuRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="max-w-52 gap-1"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Switch workspace"
        disabled={pending}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="truncate">{active.name}</span>
        <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
      </Button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Workspaces"
          className="absolute left-0 z-50 mt-1 min-w-52 border border-border bg-background p-1"
        >
          {workspaces.map((workspace) => (
            <button
              key={workspace.id}
              type="button"
              role="menuitemradio"
              aria-checked={workspace.isActive}
              className={cn(
                "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-muted",
                workspace.isActive && "bg-muted font-medium",
              )}
              disabled={pending}
              onClick={() => onSelect(workspace.id)}
            >
              <span className="truncate">{workspace.name}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {workspace.tier === "UNLIMITED" ? "Unlimited" : "Free"}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
