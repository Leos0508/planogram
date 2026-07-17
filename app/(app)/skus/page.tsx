import SkuManager from "@/components/sku-manager";
import { getSkus } from "@/lib/skus/queries";
import { canWriteWorkspace } from "@/lib/workspaces/capabilities";
import { requireWorkspace } from "@/lib/workspaces/current";
import { Suspense } from "react";

export default async function SKUsPage() {
  const access = await requireWorkspace();
  if (!access.ok) {
    throw new Error(access.message);
  }

  const skus = await getSkus();

  if (!skus.ok) {
    throw new Error(skus.message);
  }

  return (
    <Suspense
      fallback={
        <div className="flex flex-1 flex-col gap-4 p-4">
          <h1 className="font-heading text-base font-semibold uppercase tracking-wider">
            SKUs
          </h1>
          <p className="text-sm text-muted-foreground">Loading…</p>
        </div>
      }
    >
      <SkuManager
        skus={skus.data}
        canWrite={canWriteWorkspace(access.workspace)}
      />
    </Suspense>
  );
}
