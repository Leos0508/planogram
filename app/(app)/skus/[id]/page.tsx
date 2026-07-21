import SkuPackagingEditor from "@/components/sku-packaging-editor";
import { getSku } from "@/lib/skus/queries";
import { canWriteWorkspace } from "@/lib/workspaces/capabilities";
import { requireWorkspace } from "@/lib/workspaces/current";
import { notFound } from "next/navigation";

export default async function SkuPackagingEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const access = await requireWorkspace();
  if (!access.ok) {
    throw new Error(access.message);
  }

  const skuResult = await getSku(id);
  if (!skuResult.ok) {
    if (skuResult.code === "NOT_FOUND") {
      notFound();
    }
    throw new Error(skuResult.message);
  }

  return (
    <SkuPackagingEditor
      sku={skuResult.data}
      canWrite={canWriteWorkspace(access.workspace)}
    />
  );
}
