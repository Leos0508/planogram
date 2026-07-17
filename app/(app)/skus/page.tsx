import SkuManager from "@/components/sku-manager";
import { getSkus } from "@/lib/skus/queries";
import { canWriteWorkspace } from "@/lib/workspaces/capabilities";
import { requireWorkspace } from "@/lib/workspaces/current";

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
    <SkuManager
      skus={skus.data}
      canWrite={canWriteWorkspace(access.workspace)}
    />
  );
}
