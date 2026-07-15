"use client";

import CatalogPageLayout from "@/components/catalog-page-layout";
import PlanogramCard from "@/components/planogram-card";
import { useToast } from "@/components/toast-provider";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import {
  applyPlanogramListQuery,
  DEFAULT_PLANOGRAM_ITEM_FILTER,
  DEFAULT_PLANOGRAM_SORT,
  parsePlanogramItemFilter,
  parsePlanogramSort,
  type PlanogramItemFilter,
  type PlanogramSort,
} from "@/lib/planograms/filter";
import type { PlanogramListItem } from "@/lib/planograms/queries";
import {
  PLANOGRAM_NAME_MAX_LENGTH,
  validatePlanogramName,
} from "@/lib/planograms/validation";
import { LayoutGridIcon, PlusIcon, SearchIcon, XIcon } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";

const SEARCH_DEBOUNCE_MS = 250;

const SORT_OPTIONS: { value: PlanogramSort; label: string }[] = [
  { value: "updated", label: "Last updated" },
  { value: "name", label: "Name A–Z" },
  { value: "created", label: "Created date" },
];

const ITEM_FILTER_OPTIONS: { value: PlanogramItemFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "empty", label: "Empty" },
  { value: "has-items", label: "Has items" },
];

type DeleteTarget = {
  id: string;
  name: string;
};

function replaceListParams(
  router: ReturnType<typeof useRouter>,
  pathname: string,
  searchParams: URLSearchParams,
  patch: {
    q?: string | null;
    sort?: PlanogramSort;
    filter?: PlanogramItemFilter;
  },
) {
  const params = new URLSearchParams(searchParams.toString());

  if ("q" in patch) {
    const trimmed = patch.q?.trim() ?? "";
    if (trimmed) {
      params.set("q", trimmed);
    } else {
      params.delete("q");
    }
  }

  if (patch.sort !== undefined) {
    if (patch.sort === DEFAULT_PLANOGRAM_SORT) {
      params.delete("sort");
    } else {
      params.set("sort", patch.sort);
    }
  }

  if (patch.filter !== undefined) {
    if (patch.filter === DEFAULT_PLANOGRAM_ITEM_FILTER) {
      params.delete("filter");
    } else {
      params.set("filter", patch.filter);
    }
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
  const toast = useToast();
  const urlQuery = searchParams.get("q") ?? "";
  const sort = parsePlanogramSort(searchParams.get("sort"));
  const itemFilter = parsePlanogramItemFilter(searchParams.get("filter"));

  const [isCreating, startCreateTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createNameError, setCreateNameError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [searchInput, setSearchInput] = useState(urlQuery);
  const [prevUrlQuery, setPrevUrlQuery] = useState(urlQuery);

  const listBusy = isCreating || isDeleting;

  // Keep the input in sync when the URL changes (back/forward, shared links).
  if (urlQuery !== prevUrlQuery) {
    setPrevUrlQuery(urlQuery);
    setSearchInput(urlQuery);
  }

  const { schedule: scheduleQueryUpdate } = useDebouncedCallback(
    (nextQuery: string) => {
      replaceListParams(router, pathname, searchParams, { q: nextQuery });
    },
    SEARCH_DEBOUNCE_MS,
  );

  const filtered = applyPlanogramListQuery(planograms, {
    query: urlQuery,
    sort,
    itemFilter,
  });
  const hasActiveSearch = urlQuery.trim().length > 0;
  const hasActiveItemFilter = itemFilter !== DEFAULT_PLANOGRAM_ITEM_FILTER;
  const hasListConstraints = hasActiveSearch || hasActiveItemFilter;

  const clearSearch = () => {
    setSearchInput("");
    replaceListParams(router, pathname, searchParams, { q: "" });
  };

  const clearListConstraints = () => {
    setSearchInput("");
    replaceListParams(router, pathname, searchParams, {
      q: "",
      filter: DEFAULT_PLANOGRAM_ITEM_FILTER,
    });
  };

  const resetCreateDialog = () => {
    setCreateName("");
    setCreateNameError(null);
  };

  const handleCreateOpenChange = (open: boolean) => {
    if (isCreating) return;
    setCreateOpen(open);
    if (!open) resetCreateDialog();
  };

  const handleCreate = (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validatePlanogramName(createName);
    if (validationError) {
      setCreateNameError(validationError);
      return;
    }

    setCreateNameError(null);
    startCreateTransition(async () => {
      const result = await createPlanogram({ name: createName });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      setCreateOpen(false);
      resetCreateDialog();
      router.push(`/planograms/${result.data.id}`);
    });
  };

  const handleDeleteOpenChange = (open: boolean) => {
    if (isDeleting) return;
    if (!open) setDeleteTarget(null);
  };

  const handleDeleteConfirm = () => {
    if (!deleteTarget) return;

    startDeleteTransition(async () => {
      const result = await deletePlanogram({ id: deleteTarget.id });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Deleted “${deleteTarget.name}”`);
      setDeleteTarget(null);
      router.refresh();
    });
  };

  return (
    <>
      <CatalogPageLayout
        title="Planograms"
        action={
          <Button
            type="button"
            size="sm"
            disabled={listBusy}
            onClick={() => setCreateOpen(true)}
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
              disabled={listBusy}
            />
            {searchInput ? (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                className="absolute top-1/2 right-1 -translate-y-1/2"
                title="Clear search"
                onClick={clearSearch}
                disabled={listBusy}
              >
                <XIcon className="size-4" />
              </Button>
            ) : null}
          </div>
        }
        filters={
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="planogram-sort" className="sr-only">
              Sort planograms
            </Label>
            <select
              id="planogram-sort"
              value={sort}
              disabled={listBusy}
              onChange={(event) => {
                replaceListParams(router, pathname, searchParams, {
                  sort: parsePlanogramSort(event.target.value),
                });
              }}
              className="h-9 border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Sort planograms"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>

            <div
              className="flex flex-wrap items-center gap-1"
              role="group"
              aria-label="Filter by items"
            >
              {ITEM_FILTER_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={itemFilter === option.value ? "default" : "outline"}
                  aria-pressed={itemFilter === option.value}
                  disabled={listBusy}
                  onClick={() => {
                    replaceListParams(router, pathname, searchParams, {
                      filter: option.value,
                    });
                  }}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
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
            <Button
              type="button"
              size="sm"
              disabled={listBusy}
              onClick={() => setCreateOpen(true)}
            >
              <PlusIcon className="size-4" />
              New planogram
            </Button>
          </Empty>
        ) : filtered.length === 0 && hasListConstraints ? (
          <Empty className="border border-dashed">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <SearchIcon />
              </EmptyMedia>
              <EmptyTitle>No results</EmptyTitle>
              <EmptyDescription>
                {hasActiveSearch && hasActiveItemFilter
                  ? `No planograms match “${urlQuery.trim()}” with the current filter.`
                  : hasActiveSearch
                    ? `No planograms match “${urlQuery.trim()}”. Try a different name or clear the search.`
                    : "No planograms match the current filter. Try All or clear filters."}
              </EmptyDescription>
            </EmptyHeader>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearListConstraints}
              disabled={listBusy}
            >
              Clear filters
            </Button>
          </Empty>
        ) : (
          <ul className="grid w-full list-none grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((planogram) => (
              <li key={planogram.id}>
                <PlanogramCard
                  planogram={planogram}
                  disabled={listBusy}
                  onDelete={(id, name) => setDeleteTarget({ id, name })}
                />
              </li>
            ))}
          </ul>
        )}
      </CatalogPageLayout>

      <Dialog open={createOpen} onOpenChange={handleCreateOpenChange}>
        <DialogContent showCloseButton={!isCreating}>
          <DialogHeader>
            <DialogTitle>New planogram</DialogTitle>
            <DialogDescription>
              Give your planogram a name. You can add shelves and SKUs in the
              editor.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="planogram-name">Name</Label>
              <Input
                id="planogram-name"
                value={createName}
                onChange={(event) => {
                  setCreateName(event.target.value);
                  if (createNameError) setCreateNameError(null);
                }}
                placeholder="Beverage aisle"
                maxLength={PLANOGRAM_NAME_MAX_LENGTH}
                required
                autoFocus
                disabled={isCreating}
                aria-invalid={createNameError ? true : undefined}
                aria-describedby={
                  createNameError ? "planogram-name-error" : undefined
                }
              />
              {createNameError ? (
                <p
                  id="planogram-name-error"
                  className="text-sm text-destructive"
                  role="alert"
                >
                  {createNameError}
                </p>
              ) : null}
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isCreating}
                onClick={() => handleCreateOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isCreating}>
                {isCreating ? "Creating…" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={handleDeleteOpenChange}>
        <DialogContent showCloseButton={!isDeleting}>
          <DialogHeader>
            <DialogTitle>Delete planogram</DialogTitle>
            <DialogDescription>
              {deleteTarget ? (
                <>
                  Delete <strong>{deleteTarget.name}</strong>? All shelves and
                  placed items on this planogram will be permanently removed.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isDeleting}
              onClick={() => handleDeleteOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteConfirm}
            >
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
