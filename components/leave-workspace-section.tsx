"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/toast-provider";
import { leaveWorkspace } from "@/lib/workspaces/leave-actions";

export default function LeaveWorkspaceSection({
  workspaceName,
  isOwner,
  otherMemberCount,
}: {
  workspaceName: string;
  isOwner: boolean;
  otherMemberCount: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const blocked = isOwner && otherMemberCount > 0;
  const deletesWorkspace = isOwner && otherMemberCount === 0;

  const onLeave = () => {
    startTransition(async () => {
      const result = await leaveWorkspace();
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setOpen(false);
      if (result.data.deletedWorkspace) {
        toast.success(`Left and deleted ${result.data.leftWorkspaceName}`);
      } else {
        toast.success(`Left ${result.data.leftWorkspaceName}`);
      }
      router.push("/planograms");
      router.refresh();
    });
  };

  return (
    <section className="space-y-3 border-t pt-6">
      <div>
        <h2 className="text-sm font-medium">Leave workspace</h2>
        <p className="text-sm text-muted-foreground">
          {blocked
            ? "Transfer ownership to another member on the Members page before leaving."
            : deletesWorkspace
              ? "You are the only member. Leaving will permanently delete this workspace and its planograms/SKUs."
              : "You will lose access to this workspace’s planograms and SKUs."}
        </p>
      </div>

      {blocked ? (
        <Button type="button" size="sm" variant="outline" asChild>
          <a href="/settings/members">Go to Members</a>
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={pending}
          onClick={() => setOpen(true)}
        >
          Leave workspace
        </Button>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          setOpen(next);
        }}
      >
        <DialogContent showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>Leave {workspaceName}?</DialogTitle>
            <DialogDescription>
              {deletesWorkspace
                ? "This permanently deletes the workspace and all of its data. This cannot be undone."
                : "You can rejoin later if you receive a new invite."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={pending}
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              variant="destructive"
              disabled={pending}
              onClick={onLeave}
            >
              {pending
                ? "Leaving…"
                : deletesWorkspace
                  ? "Leave and delete"
                  : "Leave workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
