import SkuManager from "@/components/sku-manager";
import { getSkus } from "@/lib/skus/queries";

export default async function SKUsPage() {
  const skus = await getSkus();

  if (!skus.ok) {
    throw new Error(skus.message);
  }

  return <SkuManager skus={skus.data} />;
}
