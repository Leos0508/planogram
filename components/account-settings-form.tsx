"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/toast-provider";
import {
  deleteAccount,
  transferWorkspaceOwnership,
  type AccountDeletionStatus,
} from "@/lib/account/actions";
import { ChangePasswordForm } from "@/components/change-password-form";
import { ThemePreferenceSelect } from "@/components/theme-controls";
import { updateDisplayName } from "@/lib/settings/actions";
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/settings/validation";

export default function AccountSettingsForm({
  initialName,
  email,
  hasPassword,
  supportEmail,
  deletion,
}: {
  initialName: string | null;
  email: string;
  hasPassword: boolean;
  supportEmail: string | null;
  deletion: AccountDeletionStatus;
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initialName ?? "");
  const [pending, startTransition] = useTransition();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [transferMemberId, setTransferMemberId] = useState(
    deletion.transferCandidates[0]?.memberId ?? "",
  );

  const dirty = name.trim() !== (initialName ?? "").trim();
  const blocked = deletion.blockers.length > 0;
  const confirmationMatches =
    confirmation.trim().toLowerCase() === email.trim().toLowerCase();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();

    startTransition(async () => {
      const result = await updateDisplayName({ name });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Display name updated");
      setName(result.data.name ?? "");
      router.refresh();
    });
  };

  const onTransfer = () => {
    if (!deletion.currentWorkspaceId || !transferMemberId) return;

    startTransition(async () => {
      const result = await transferWorkspaceOwnership({
        workspaceId: deletion.currentWorkspaceId!,
        memberId: transferMemberId,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Ownership transferred");
      router.refresh();
    });
  };

  const onDeleteConfirm = () => {
    startTransition(async () => {
      const result = await deleteAccount({ confirmation });
      if (result && !result.ok) {
        toast.error(result.message);
        return;
      }
      // Successful delete redirects via signOut.
    });
  };

  return (
    <div className="space-y-10">
      <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            disabled={pending}
            placeholder="Your name"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="account-email">Email</Label>
          <Input id="account-email" value={email} disabled readOnly />
        </div>
        <div>
          <Button type="submit" size="sm" disabled={pending || !dirty}>
            Save
          </Button>
        </div>
      </form>

      <section className="max-w-md space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-medium">Appearance</h2>
          <p className="text-sm text-muted-foreground">
            Choose light, dark, or match your device.
          </p>
        </div>
        <ThemePreferenceSelect />
      </section>

      <section className="max-w-md space-y-3">
        <div className="space-y-1">
          <h2 className="text-sm font-medium">Password</h2>
          <p className="text-sm text-muted-foreground">
            Update the password for your email/password sign-in.
          </p>
        </div>
        <ChangePasswordForm hasPassword={hasPassword} />
      </section>

      {supportEmail ? (
        <section className="max-w-md space-y-1">
          <h2 className="text-sm font-medium">Support</h2>
          <p className="text-sm text-muted-foreground">
            Need help?{" "}
            <a
              href={`mailto:${supportEmail}`}
              className="text-foreground underline-offset-4 hover:underline"
            >
              {supportEmail}
            </a>
          </p>
        </section>
      ) : null}

      <section className="max-w-md space-y-4 border border-destructive/30 p-4">
        <div className="space-y-1">
          <h2 className="text-sm font-medium text-destructive">Danger zone</h2>
          <p className="text-sm text-muted-foreground">
            Permanently delete your account and sign out. This cannot be undone.
          </p>
        </div>

        {blocked ? (
          <div className="space-y-3">
            <p className="text-sm text-destructive" role="alert">
              Transfer ownership before deleting. You still own{" "}
              {deletion.blockers.map((item) => item.workspaceName).join(", ")}{" "}
              with other members.
            </p>
            {deletion.transferCandidates.length > 0 &&
            deletion.currentWorkspaceId ? (
              <div className="flex flex-col gap-2">
                <Label htmlFor="transfer-member">New owner</Label>
                <select
                  id="transfer-member"
                  className="h-9 border border-border bg-background px-2 text-sm"
                  value={transferMemberId}
                  disabled={pending}
                  onChange={(event) => setTransferMemberId(event.target.value)}
                >
                  {deletion.transferCandidates.map((candidate) => (
                    <option key={candidate.memberId} value={candidate.memberId}>
                      {candidate.name?.trim() || candidate.email}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={pending || !transferMemberId}
                  onClick={onTransfer}
                >
                  Transfer ownership
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No members available to receive ownership.
              </p>
            )}
          </div>
        ) : (
          <Button
            type="button"
            size="sm"
            variant="destructive"
            disabled={pending}
            onClick={() => {
              setConfirmation("");
              setDeleteOpen(true);
            }}
          >
            Delete account
          </Button>
        )}
      </section>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          if (pending) return;
          setDeleteOpen(open);
          if (!open) setConfirmation("");
        }}
      >
        <DialogContent showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              This permanently deletes your account
              {deletion.soleOwned.length > 0
                ? ` and workspace data for ${deletion.soleOwned
                    .map((item) => item.workspaceName)
                    .join(", ")}`
                : ""}
              . Type <strong>{email}</strong> to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="delete-confirmation">Email confirmation</Label>
            <Input
              id="delete-confirmation"
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
              disabled={pending}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={pending || !confirmationMatches}
              onClick={onDeleteConfirm}
            >
              {pending ? "Deleting…" : "Delete account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
