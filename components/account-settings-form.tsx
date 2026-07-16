"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast-provider";
import { updateDisplayName } from "@/lib/settings/actions";
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/settings/validation";

export default function AccountSettingsForm({
  initialName,
  email,
}: {
  initialName: string | null;
  email: string;
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initialName ?? "");
  const [pending, startTransition] = useTransition();

  const dirty = name.trim() !== (initialName ?? "").trim();

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

  return (
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
  );
}
