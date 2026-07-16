import PlanogramEditorLayout from "@/components/planogram-editor-layout";
import NotFound from "@/components/not-found";
import { getPlanogram } from "@/lib/planograms/queries";
import { getSkus } from "@/lib/skus/queries";

export default async function PlanogramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const planogramResult = await getPlanogram(id);
  const skusResult = await getSkus();

  if (!skusResult.ok) {
    if (skusResult.code === "NOT_FOUND") {
      return <NotFound />;
    }
    throw new Error(skusResult.message);
  }

  if (!planogramResult.ok) {
    if (planogramResult.code === "NOT_FOUND") {
      return <NotFound />;
    }
    throw new Error(planogramResult.message);
  }

  const planogram = planogramResult.data;
  const skus = skusResult.data;

  return <PlanogramEditorLayout planogram={planogram} skus={skus} />;
}
