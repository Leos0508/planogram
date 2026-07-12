import PlanogramsPageClient from "@/components/planograms-page-client";
import { getPlanograms } from "@/lib/planograms/queries";

export default async function PlanogramsPage() {
  const planograms = await getPlanograms();

  if (!planograms.ok) {
    throw new Error(planograms.message);
  }

  return <PlanogramsPageClient planograms={planograms.data} />;
}
