"use client";

import CatalogPageLayout from "@/components/catalog-page-layout";
import PlanogramCard from "@/components/planogram-card";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPlanogram, deletePlanogram } from "@/lib/planograms/actions";
import type { PlanogramListItem } from "@/lib/planograms/queries";
import { LayoutGridIcon, PlusIcon } from "lucide-react";
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
    <CatalogPageLayout
      title="Planograms"
      action={
        <Button
          type="button"
          variant={showCreate ? "secondary" : "default"}
          size="sm"
          onClick={() => setShowCreate((open) => !open)}
        >
          <PlusIcon className="size-4" />
          New
        </Button>
      }
      banner={
        showCreate ? (
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
        ) : null
      }
      alert={
        error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null
      }
    >
      {planograms.length === 0 ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <LayoutGridIcon />
            </EmptyMedia>
            <EmptyTitle>No planograms yet</EmptyTitle>
            <EmptyDescription>
              Create a planogram to start placing SKUs on shelves.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <ul className="grid w-full list-none grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {planograms.map((planogram) => (
            <li key={planogram.id}>
              <PlanogramCard
                planogram={planogram}
                disabled={pending}
                onDelete={handleDelete}
              />
            </li>
          ))}
        </ul>
      )}
    </CatalogPageLayout>
  );
}
