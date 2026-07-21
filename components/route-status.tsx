import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyTitle,
} from "@/components/ui/empty";
import { Loader2Icon } from "lucide-react";
import Link from "next/link";

export function RouteNotFoundPanel() {
  return (
    <Empty className="border-0">
      <EmptyHeader>
        <EmptyTitle>Not found</EmptyTitle>
        <EmptyDescription>
          This page or resource does not exist, or you do not have access.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button asChild size="sm">
            <Link href="/planograms">Planograms</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/skus">SKUs</Link>
          </Button>
        </div>
      </EmptyContent>
    </Empty>
  );
}

export function RouteErrorPanel({
  reset,
  digest,
}: {
  reset: () => void;
  digest?: string;
}) {
  return (
    <Empty className="border-0">
      <EmptyHeader>
        <EmptyTitle>Something went wrong</EmptyTitle>
        <EmptyDescription>
          An unexpected error occurred. Try again, or go back to the catalog.
        </EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button type="button" size="sm" onClick={reset}>
            Try again
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/planograms">Planograms</Link>
          </Button>
        </div>
        {digest ? (
          <p className="font-mono text-xs text-muted-foreground">
            Ref: {digest}
          </p>
        ) : null}
      </EmptyContent>
    </Empty>
  );
}

export function RouteLoadingPanel() {
  return (
    <div
      className="flex w-full min-w-0 flex-1 flex-col items-center justify-center gap-3 p-12"
      role="status"
      aria-live="polite"
      aria-busy="true"
      aria-label="Loading"
    >
      <Loader2Icon className="size-5 animate-spin text-primary" aria-hidden />
      <p className="text-sm text-muted-foreground">Loading…</p>
    </div>
  );
}
