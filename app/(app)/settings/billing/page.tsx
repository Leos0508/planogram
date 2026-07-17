import { BillingSettingsPanel } from "@/components/billing-settings-panel";
import { WorkspaceRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspaces/current";
import { redirect } from "next/navigation";

export default async function BillingSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const access = await requireWorkspace();
  if (!access.ok) {
    redirect("/login");
  }

  const params = await searchParams;
  const checkout =
    params.checkout === "success" || params.checkout === "cancel"
      ? params.checkout
      : null;

  const billing = await prisma.workspace.findUnique({
    where: { id: access.workspace.id },
    select: {
      stripeCustomerId: true,
      tier: true,
    },
  });

  return (
    <div className="flex flex-col gap-2">
      <h1 className="font-heading text-base font-semibold uppercase tracking-wider">
        Billing
      </h1>
      <p className="mb-4 text-sm text-muted-foreground">
        Subscription for the active workspace.
      </p>
      <BillingSettingsPanel
        workspaceName={access.workspace.name}
        tier={billing?.tier ?? access.workspace.tier}
        isOwner={access.workspace.role === WorkspaceRole.OWNER}
        hasCustomer={Boolean(billing?.stripeCustomerId)}
        checkoutResult={checkout}
      />
    </div>
  );
}
