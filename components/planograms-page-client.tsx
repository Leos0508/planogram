"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPlanogram, deletePlanogram } from "@/lib/planograms/actions";
import type { PlanogramListItem } from "@/lib/planograms/queries";
import { PlusIcon, Trash2Icon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function PlanogramsPageClient({
  planograms,
}: {
  planograms: PlanogramListItem[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createPlanogram({ name });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setName("");
      setShowCreate(false);
      router.push(`/planograms/${result.data.id}`);
    });
  };

  const handleDelete = (id: string, planogramName: string) => {
    if (
      !window.confirm(
        `Delete "${planogramName}"? All items on this planogram will be removed.`,
      )
    ) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deletePlanogram({ id });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.refresh();
    });
  };

  return (
    <div className="flex flex-1 flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <h1 className="font-heading text-base font-semibold uppercase tracking-wider">
          Planograms
        </h1>
        <Button
          type="button"
          variant={showCreate ? "secondary" : "default"}
          size="sm"
          onClick={() => setShowCreate((open) => !open)}
        >
          <PlusIcon className="size-4" />
          New
        </Button>
      </div>

      {showCreate ? (
        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-3 border bg-card p-4"
        >
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="planogram-name">Name</Label>
            <Input
              id="planogram-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Beverage aisle"
              required
              autoFocus
            />
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={pending}>
              Create
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowCreate(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      ) : null}

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {planograms.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No planograms yet. Create one to get started.
        </p>
      ) : (
        <div className="grid w-full grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {planograms.map((planogram) => (
            <div
              key={planogram.id}
              className="flex items-center gap-2 border bg-card px-4 py-3 text-card-foreground"
            >
              <Link
                href={`/planograms/${planogram.id}`}
                className="min-w-0 flex-1 truncate hover:text-primary"
              >
                {planogram.name}
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                title={`Delete ${planogram.name}`}
                disabled={pending}
                onClick={() => handleDelete(planogram.id, planogram.name)}
              >
                <Trash2Icon className="size-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
