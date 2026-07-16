"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/toast-provider";
import { updateWorkspaceName } from "@/lib/settings/actions";
import { WORKSPACE_NAME_MAX_LENGTH } from "@/lib/settings/validation";

export default function WorkspaceSettingsForm({
  initialName,
  canEdit,
}: {
  initialName: string;
  canEdit: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();

  const dirty = name.trim() !== initialName.trim();

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!canEdit) return;

    startTransition(async () => {
      const result = await updateWorkspaceName({ name });
      if (!result.ok) {
        toast.error(result.message);
        return;
      }
      toast.success("Workspace name updated");
      setName(result.data.name);
      router.refresh();
    });
  };

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="workspace-name">Workspace name</Label>
        <Input
          id="workspace-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          maxLength={WORKSPACE_NAME_MAX_LENGTH}
          disabled={!canEdit || pending}
          required
        />
        {!canEdit ? (
          <p className="text-xs text-muted-foreground">
            Only the workspace owner can rename this workspace.
          </p>
        ) : null}
      </div>
      {canEdit ? (
        <div>
          <Button type="submit" size="sm" disabled={pending || !dirty}>
            Save
          </Button>
        </div>
      ) : null}
    </form>
  );
}
