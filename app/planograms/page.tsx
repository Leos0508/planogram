import PlanogramsPageClient from "@/components/planograms-page-client";
import { getPlanograms } from "@/lib/planograms/queries";
import { Suspense } from "react";

export default async function PlanogramsPage() {
  const planograms = await getPlanograms();

  if (!planograms.ok) {
    throw new Error(planograms.message);
  }

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col gap-4 p-4">
          <h1 className="font-heading text-base font-semibold uppercase tracking-wider">
            Planograms
          </h1>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <PlanogramsPageClient planograms={planograms.data} />
    </Suspense>
  );
}
