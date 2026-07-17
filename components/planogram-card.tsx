"use client";

import { Button } from "@/components/ui/button";
import { formatRelativeTime } from "@/lib/format-relative-time";
import type { PlanogramListItem } from "@/lib/planograms/queries";
import { Trash2Icon } from "lucide-react";
import Link from "next/link";

function formatShelfCount(count: number): string {
  return count === 1 ? "1 shelf" : `${count} shelves`;
}

function formatItemCount(count: number): string {
  if (count === 0) return "Empty";
  return count === 1 ? "1 item" : `${count} items`;
}

export default function PlanogramCard({
  planogram,
  disabled,
  canDelete = true,
  onDelete,
}: {
  planogram: PlanogramListItem;
  disabled?: boolean;
  canDelete?: boolean;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <article className="relative border bg-card text-card-foreground">
      <Link
        href={`/planograms/${planogram.id}`}
        className={
          canDelete
            ? "block p-4 pr-12 transition-colors hover:bg-accent/50 hover:text-accent-foreground"
            : "block p-4 transition-colors hover:bg-accent/50 hover:text-accent-foreground"
        }
      >
        <h2 className="truncate font-medium">{planogram.name}</h2>
        <p className="mt-2 font-mono text-xs text-muted-foreground">
          {formatShelfCount(planogram.shelfCount)}
          <span className="mx-1.5 text-border">·</span>
          {formatItemCount(planogram.itemCount)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Updated {formatRelativeTime(planogram.updatedAt)}
        </p>
      </Link>
      {canDelete ? (
        <Button
          type="button"
          variant="ghost"
          size="icon-sm"
          className="absolute top-2 right-2"
          title={`Delete ${planogram.name}`}
          disabled={disabled}
          onClick={() => onDelete(planogram.id, planogram.name)}
        >
          <Trash2Icon className="size-4 text-destructive" />
        </Button>
      ) : null}
    </article>
  );
}
