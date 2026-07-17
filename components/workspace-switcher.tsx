"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ChevronsUpDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast-provider";
import {
  createWorkspace,
  setActiveWorkspace,
} from "@/lib/workspaces/actions";
import {
  canOwnAnotherWorkspace,
  countOwnedWorkspaces,
  ownedWorkspaceLimitMessage,
  ownsUnlimitedWorkspace,
} from "@/lib/workspaces/limits";
import type { WorkspaceMembershipListItem } from "@/lib/workspaces/list";
import { catalogPathAfterSwitch } from "@/lib/workspaces/switch-path";
import { WORKSPACE_NAME_MAX_LENGTH } from "@/lib/settings/validation";
import { cn } from "@/lib/utils";

export default function WorkspaceSwitcher({
  workspaces,
}: {
  workspaces: WorkspaceMembershipListItem[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  const active =
    workspaces.find((workspace) => workspace.isActive) ?? workspaces[0];

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

  if (workspaces.length === 0 || !active) {
    return null;
  }

  const onSelect = (workspaceId: string) => {
    if (workspaceId === active.id || pending) {
      setMenuOpen(false);
      return;
    }

    startTransition(async () => {
      const result = await setActiveWorkspace({ workspaceId });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setMenuOpen(false);
      const nextPath = catalogPathAfterSwitch(pathname);
      if (nextPath) {
        router.push(nextPath);
      }
      router.refresh();
    });
  };

  const ownedCount = countOwnedWorkspaces(workspaces);
  const hasUnlimited = ownsUnlimitedWorkspace(workspaces);
  const canCreate = canOwnAnotherWorkspace(ownedCount, hasUnlimited);
  const createBlockedReason = canCreate
    ? null
    : ownedWorkspaceLimitMessage();

  const openCreate = () => {
    if (!canCreate) return;
    setMenuOpen(false);
    setName("");
    setCreateOpen(true);
  };

  const onCreate = () => {
    if (!canCreate) return;
    startTransition(async () => {
      const result = await createWorkspace({ name });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      toast.success(`Created ${result.data.name}`);
      setCreateOpen(false);
      setName("");
      router.push("/planograms");
      router.refresh();
    });
  };

  return (
    <>
      <div className="relative" ref={menuRef}>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="max-w-52 gap-1"
          aria-expanded={menuOpen}
          aria-controls={menuId}
          aria-label="Switch workspace"
          disabled={pending}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span className="truncate">{active.name}</span>
          <ChevronsUpDownIcon className="size-3.5 shrink-0 text-muted-foreground" />
        </Button>
        {menuOpen ? (
          <div
            id={menuId}
            role="menu"
            aria-label="Workspaces"
            className="absolute left-0 z-50 mt-1 min-w-56 border border-border bg-background p-1"
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
            <div className="my-1 border-t border-border" />
            <button
              type="button"
              role="menuitem"
              className={cn(
                "w-full px-3 py-2 text-left text-sm",
                canCreate
                  ? "hover:bg-muted"
                  : "cursor-not-allowed text-muted-foreground",
              )}
              disabled={pending || !canCreate}
              title={createBlockedReason ?? undefined}
              aria-disabled={!canCreate}
              onClick={openCreate}
            >
              Create workspace
            </button>
            {createBlockedReason ? (
              <p className="px-3 pb-2 text-xs text-muted-foreground">
                {createBlockedReason}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <Dialog
        open={createOpen && canCreate}
        onOpenChange={(open) => {
          if (pending) return;
          if (!canCreate) {
            setCreateOpen(false);
            return;
          }
          setCreateOpen(open);
          if (!open) setName("");
        }}
      >
        <DialogContent showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>Create workspace</DialogTitle>
            <DialogDescription>
              Start an empty workspace. You will be the owner.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="new-workspace-name">Name</Label>
            <Input
              id="new-workspace-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              maxLength={WORKSPACE_NAME_MAX_LENGTH}
              disabled={pending}
              autoFocus
              required
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onCreate();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={pending || name.trim().length === 0}
              onClick={onCreate}
            >
              {pending ? "Creating…" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
