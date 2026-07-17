"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast-provider";
import {
  createBillingPortalSession,
  createCheckoutSession,
} from "@/lib/billing/actions";
import type { WorkspaceTier } from "@/generated/prisma/client";

export function BillingSettingsPanel({
  workspaceName,
  tier,
  isOwner,
  hasCustomer,
  checkoutResult,
}: {
  workspaceName: string;
  tier: WorkspaceTier;
  isOwner: boolean;
  hasCustomer: boolean;
  checkoutResult?: "success" | "cancel" | null;
}) {
  const toast = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const isUnlimited = tier === "UNLIMITED";

  const onUpgrade = () => {
    startTransition(async () => {
      const result = await createCheckoutSession();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      window.location.href = result.data.url;
    });
  };

  const onManage = () => {
    startTransition(async () => {
      const result = await createBillingPortalSession();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      window.location.href = result.data.url;
    });
  };

  return (
    <div className="flex max-w-lg flex-col gap-4">
      {checkoutResult === "success" ? (
        <p className="text-sm text-muted-foreground">
          Checkout completed. If Unlimited is not shown yet, refresh in a
          moment while the webhook syncs.
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-2 h-auto px-1"
            onClick={() => router.refresh()}
          >
            Refresh
          </Button>
        </p>
      ) : null}
      {checkoutResult === "cancel" ? (
        <p className="text-sm text-muted-foreground">Checkout was canceled.</p>
      ) : null}

      <div className="flex flex-col gap-1">
        <p className="text-sm">
          Plan for{" "}
          <span className="font-medium text-foreground">{workspaceName}</span>
        </p>
        <p className="text-2xl font-semibold tracking-tight">
          {isUnlimited ? "Unlimited" : "Free"}
        </p>
        <p className="text-sm text-muted-foreground">
          {isUnlimited
            ? "No planogram cap on this workspace. Owning Unlimited also lifts the free owned-workspace limit."
            : "Free includes up to 20 planograms. Upgrade for Unlimited."}
        </p>
      </div>

      {isOwner ? (
        <div className="flex flex-wrap gap-2">
          {!isUnlimited ? (
            <Button
              type="button"
              size="sm"
              disabled={pending}
              onClick={onUpgrade}
            >
              {pending ? "Redirecting…" : "Upgrade to Unlimited"}
            </Button>
          ) : null}
          {hasCustomer ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={onManage}
            >
              Manage billing
            </Button>
          ) : null}
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          Only the workspace owner can upgrade or manage billing.
        </p>
      )}
    </div>
  );
}
