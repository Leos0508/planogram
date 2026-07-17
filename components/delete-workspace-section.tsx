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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast-provider";
import { deleteWorkspace } from "@/lib/workspaces/delete-actions";

export default function DeleteWorkspaceSection({
  workspaceName,
  otherMemberCount,
}: {
  workspaceName: string;
  otherMemberCount: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [pending, startTransition] = useTransition();

  const blocked = otherMemberCount > 0;
  const confirmationMatches =
    confirmation.trim().toLowerCase() === workspaceName.trim().toLowerCase();

  const onDelete = () => {
    startTransition(async () => {
      const result = await deleteWorkspace({ confirmation });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }

      setOpen(false);
      toast.success(`Deleted ${result.data.deletedWorkspaceName}`);
      router.push("/planograms");
      router.refresh();
    });
  };

  return (
    <section className="space-y-3 border-t pt-6">
      <div>
        <h2 className="text-sm font-medium">Delete workspace</h2>
        <p className="text-sm text-muted-foreground">
          {blocked
            ? "Remove or transfer other members on the Members page before deleting."
            : "Permanently deletes this workspace and its planograms/SKUs. You will stay signed in with another workspace (or a new personal one). To remove your account entirely, use Account → Delete account."}
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
          variant="destructive"
          disabled={pending}
          onClick={() => {
            setConfirmation("");
            setOpen(true);
          }}
        >
          Delete workspace
        </Button>
      )}

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (pending) return;
          setOpen(next);
          if (!next) setConfirmation("");
        }}
      >
        <DialogContent showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>Delete {workspaceName}?</DialogTitle>
            <DialogDescription>
              This permanently deletes the workspace and all of its data. Type{" "}
              <strong>{workspaceName}</strong> to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delete-workspace-confirmation">
              Workspace name
            </Label>
            <Input
              id="delete-workspace-confirmation"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              autoComplete="off"
              disabled={pending}
            />
          </div>
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
              disabled={pending || !confirmationMatches}
              onClick={onDelete}
            >
              {pending ? "Deleting…" : "Delete workspace"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
