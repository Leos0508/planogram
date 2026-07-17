"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/toast-provider";
import { acceptInvite } from "@/lib/members/actions";
import {
  inviteAlreadyMemberMessage,
  inviteJoinedStayMessage,
} from "@/lib/members/invite";
import { setActiveWorkspace } from "@/lib/workspaces/actions";

type PostJoinState = {
  workspaceId: string;
  workspaceName: string;
  alreadyMember: boolean;
  offerSwitch: boolean;
};

export default function InviteAcceptClient({
  token,
  workspaceId,
  workspaceName,
  expired,
  alreadyMember,
  isJoinedActive,
}: {
  token: string;
  workspaceId: string;
  workspaceName: string;
  expired: boolean;
  alreadyMember: boolean;
  isJoinedActive: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [postJoin, setPostJoin] = useState<PostJoinState | null>(
    alreadyMember && !expired
      ? {
          workspaceId,
          workspaceName,
          alreadyMember: true,
          offerSwitch: !isJoinedActive,
        }
      : null,
  );

  const goPlanograms = () => {
    router.push("/planograms");
    router.refresh();
  };

  const onAccept = () => {
    startTransition(async () => {
      const result = await acceptInvite({ token });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      const offerSwitch = !result.data.isJoinedActive;
      if (result.data.alreadyMember) {
        toast.success(inviteAlreadyMemberMessage(result.data.workspaceName));
      } else {
        toast.success(inviteJoinedStayMessage(result.data.workspaceName));
      }

      setPostJoin({
        workspaceId: result.data.workspaceId,
        workspaceName: result.data.workspaceName,
        alreadyMember: result.data.alreadyMember,
        offerSwitch,
      });
    });
  };

  const onSwitch = () => {
    if (!postJoin) return;
    startTransition(async () => {
      const result = await setActiveWorkspace({
        workspaceId: postJoin.workspaceId,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success(`Switched to ${postJoin.workspaceName}`);
      goPlanograms();
    });
  };

  return (
    <div className="w-full max-w-md space-y-4 border border-border bg-card p-6">
      <div className="space-y-1">
        <h1 className="text-base font-semibold">Join workspace</h1>
        <p className="text-sm text-muted-foreground">
          You were invited to{" "}
          <span className="text-foreground">{workspaceName}</span>.
        </p>
      </div>

      {expired ? (
        <p className="text-sm text-destructive" role="alert">
          This invite link is invalid or expired.
        </p>
      ) : postJoin ? (
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {postJoin.alreadyMember
              ? inviteAlreadyMemberMessage(postJoin.workspaceName)
              : inviteJoinedStayMessage(postJoin.workspaceName)}
          </p>
          <div className="flex flex-wrap gap-2">
            {postJoin.offerSwitch ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  disabled={pending}
                  onClick={goPlanograms}
                >
                  Stay on current workspace
                </Button>
                <Button type="button" disabled={pending} onClick={onSwitch}>
                  {pending
                    ? "Switching…"
                    : `Switch to ${postJoin.workspaceName}`}
                </Button>
              </>
            ) : (
              <Button type="button" onClick={goPlanograms}>
                Open planograms
              </Button>
            )}
          </div>
        </div>
      ) : (
        <Button type="button" disabled={pending} onClick={onAccept}>
          {pending ? "Joining…" : "Accept invite"}
        </Button>
      )}
    </div>
  );
}
