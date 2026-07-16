import { WorkspaceRole } from "@/generated/prisma/client";
import WorkspaceSettingsForm from "@/components/workspace-settings-form";
import { requireWorkspace } from "@/lib/workspaces/current";
import { redirect } from "next/navigation";

export default async function SettingsWorkspacePage() {
  const access = await requireWorkspace();
  if (!access.ok) {
    redirect("/login");
  }

  const canEdit = access.workspace.role === WorkspaceRole.OWNER;

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your workspace profile.
        </p>
      </div>
      <WorkspaceSettingsForm
        initialName={access.workspace.name}
        canEdit={canEdit}
      />
    </div>
  );
}
