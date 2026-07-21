import PlanogramsPageClient from "@/components/planograms-page-client";
import { RouteLoadingPanel } from "@/components/route-status";
import { getPlanograms } from "@/lib/planograms/queries";
import { canWriteWorkspace } from "@/lib/workspaces/capabilities";
import { requireWorkspace } from "@/lib/workspaces/current";
import {
  canCreatePlanogramOnTier,
  freePlanogramLimitMessage,
} from "@/lib/workspaces/limits";
import { Suspense } from "react";

export default async function PlanogramsPage() {
  const access = await requireWorkspace();
  if (!access.ok) {
    throw new Error(access.message);
  }

  const planograms = await getPlanograms();

  if (!planograms.ok) {
    throw new Error(planograms.message);
  }

  const canWrite = canWriteWorkspace(access.workspace);
  const atPlanogramLimit = !canCreatePlanogramOnTier(
    access.workspace.tier,
    planograms.data.length,
  );
  const createBlockedReason =
    canWrite && atPlanogramLimit ? freePlanogramLimitMessage() : null;

  return (
    <Suspense fallback={<RouteLoadingPanel />}>
      <PlanogramsPageClient
        planograms={planograms.data}
        canWrite={canWrite}
        createBlockedReason={createBlockedReason}
      />
    </Suspense>
  );
}
