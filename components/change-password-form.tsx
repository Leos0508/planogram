"use client";

import { useState, useTransition, type FormEvent } from "react";
import { PasswordInput } from "@/components/password-input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast-provider";
import { changePassword } from "@/lib/auth/password-actions";
import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-shared";

export function ChangePasswordForm({
  hasPassword,
}: {
  hasPassword: boolean;
}) {
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  if (!hasPassword) {
    return (
      <p className="text-sm text-muted-foreground">
        Password change is only available for email/password accounts.
      </p>
    );
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    startTransition(async () => {
      const result = await changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Password updated");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="current-password">Current password</Label>
        <PasswordInput
          id="current-password"
          autoComplete="current-password"
          value={currentPassword}
          onChange={(event) => setCurrentPassword(event.target.value)}
          disabled={pending}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="new-password">New password</Label>
        <PasswordInput
          id="new-password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          disabled={pending}
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirm-password">Confirm new password</Label>
        <PasswordInput
          id="confirm-password"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          disabled={pending}
          required
        />
      </div>
      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Updating…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
