"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast-provider";
import { acceptInvite } from "@/lib/members/actions";

export default function InviteAcceptClient({
  token,
  workspaceName,
  expired,
  alreadyMember,
}: {
  token: string;
  workspaceName: string;
  expired: boolean;
  alreadyMember: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();

  const onAccept = () => {
    startTransition(async () => {
      const result = await acceptInvite({ token });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Joined ${result.data.workspaceName}`);
      router.push("/planograms");
      router.refresh();
    });
  };

  return (
    <div className="w-full max-w-md space-y-4 border border-border bg-card p-6">
      <div className="space-y-1">
        <h1 className="text-base font-semibold">Join workspace</h1>
        <p className="text-sm text-muted-foreground">
          You were invited to <span className="text-foreground">{workspaceName}</span>.
        </p>
      </div>

      {expired ? (
        <p className="text-sm text-destructive" role="alert">
          This invite link is invalid or expired.
        </p>
      ) : alreadyMember ? (
        <>
          <p className="text-sm text-muted-foreground">
            You are already a member of this workspace.
          </p>
          <Button type="button" onClick={() => router.push("/planograms")}>
            Open planograms
          </Button>
        </>
      ) : (
        <Button type="button" disabled={pending} onClick={onAccept}>
          {pending ? "Joining…" : "Accept invite"}
        </Button>
      )}
    </div>
  );
}
