import { WorkspaceRole } from "@/generated/prisma/enums";
import DeleteWorkspaceSection from "@/components/delete-workspace-section";
import LeaveWorkspaceSection from "@/components/leave-workspace-section";
import WorkspaceSettingsForm from "@/components/workspace-settings-form";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspaces/current";
import { redirect } from "next/navigation";

export default async function SettingsWorkspacePage() {
  const access = await requireWorkspace();
  if (!access.ok) {
    redirect("/login");
  }

  const isOwner = access.workspace.role === WorkspaceRole.OWNER;
  const memberCount = await prisma.workspaceMember.count({
    where: { workspaceId: access.workspace.id },
  });
  const otherMemberCount = Math.max(0, memberCount - 1);

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Workspace
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage profile for{" "}
          <span className="text-foreground">{access.workspace.name}</span>.
        </p>
      </div>
      <WorkspaceSettingsForm
        key={access.workspace.id}
        initialName={access.workspace.name}
        canEdit={isOwner}
      />
      <LeaveWorkspaceSection
        key={`leave-${access.workspace.id}`}
        workspaceName={access.workspace.name}
        isOwner={isOwner}
        otherMemberCount={otherMemberCount}
      />
      {isOwner ? (
        <DeleteWorkspaceSection
          key={`delete-${access.workspace.id}`}
          workspaceName={access.workspace.name}
          otherMemberCount={otherMemberCount}
        />
      ) : null}
    </div>
  );
}
