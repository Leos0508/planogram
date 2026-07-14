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
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { createPlanogram, deletePlanogram } from "@/lib/planograms/actions";
import { filterPlanogramsByName } from "@/lib/planograms/filter";
import type { PlanogramListItem } from "@/lib/planograms/queries";
import { LayoutGridIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

const SEARCH_DEBOUNCE_MS = 250;

function replaceSearchQuery(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: URLSearchParams,
  query: string,
) {
  const params = new URLSearchParams(searchParams.toString());
  const trimmed = query.trim();
  if (trimmed) {
    params.set("q", trimmed);
  } else {
    params.delete("q");
  }

  const queryString = params.toString();
  router.replace(queryString ? `${pathname}?${queryString}` : pathname, {
    scroll: false,
  });
}

export default function PlanogramsPageClient({
  planograms,
}: {
  planograms: PlanogramListItem[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const urlQuery = searchParams.get("q") ?? "";

  const [pending, startTransition] = useTransition();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(urlQuery);
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);

  // Keep the input in sync when the URL changes (back/forward, shared links).
  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    setSearchInput(urlQuery);
  }

  const { schedule: scheduleQueryUpdate } = useDebouncedCallback(
    (nextQuery: string) => {
      replaceSearchQuery(router, pathname, searchParams, nextQuery);
    },
    SEARCH_DEBOUNCE_MS,
  );

  const filtered = filterPlanogramsByName(planograms, urlQuery);
  const hasActiveSearch = urlQuery.trim().length > 0;

  const clearSearch = () => {
    setSearchInput("");
    replaceSearchQuery(router, pathname, searchParams, "");
  };

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
      search={
        <div className="relative">
          <SearchIcon
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="planogram-search"
            type="text"
            value={searchInput}
            onChange={(event) => {
              const value = event.target.value;
              setSearchInput(value);
              scheduleQueryUpdate(value);
            }}
            placeholder="Search by name"
            className="pr-9 pl-9"
            aria-label="Search planograms by name"
          />
          {searchInput ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="absolute top-1/2 right-1 -translate-y-1/2"
              title="Clear search"
              onClick={clearSearch}
            >
              <XIcon className="size-4" />
            </Button>
          ) : null}
        </div>
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
      ) : filtered.length === 0 && hasActiveSearch ? (
        <Empty className="border border-dashed">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <SearchIcon />
            </EmptyMedia>
            <EmptyTitle>No results</EmptyTitle>
            <EmptyDescription>
              No planograms match “{urlQuery.trim()}”. Try a different name or
              clear the search.
            </EmptyDescription>
          </EmptyHeader>
          <Button type="button" variant="outline" size="sm" onClick={clearSearch}>
            Clear search
          </Button>
        </Empty>
      ) : (
        <ul className="grid w-full list-none grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filtered.map((planogram) => (
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
