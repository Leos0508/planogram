import MembersSettingsClient from "@/components/members-settings-client";
import {
  getActiveInvite,
  listWorkspaceMembers,
} from "@/lib/members/actions";
import { canManageMembers } from "@/lib/workspaces/capabilities";
import { requireWorkspace } from "@/lib/workspaces/current";
import { redirect } from "next/navigation";

export default async function SettingsMembersPage() {
  const access = await requireWorkspace();
  if (!access.ok) {
    redirect("/login");
  }

  const membersResult = await listWorkspaceMembers();
  if (!membersResult.ok) {
    return (
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Members
        </h1>
        <p className="text-sm text-destructive">{membersResult.message}</p>
      </div>
    );
  }

  const canManage = canManageMembers(access.workspace);
  let inviteView: {
    id: string;
    token: string;
    expiresAtLabel: string;
  } | null = null;

  if (canManage) {
    const inviteResult = await getActiveInvite();
    if (inviteResult.ok && inviteResult.data) {
      inviteView = {
        id: inviteResult.data.id,
        token: inviteResult.data.token,
        expiresAtLabel: inviteResult.data.expiresAt.toLocaleString(),
      };
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Members
        </h1>
        <p className="text-sm text-muted-foreground">
          Invite collaborators and manage access for{" "}
          <span className="text-foreground">{access.workspace.name}</span>.
        </p>
      </div>
      <MembersSettingsClient
        key={access.workspace.id}
        members={membersResult.data}
        activeInvite={inviteView}
        canManage={canManage}
      />
    </div>
  );
}
