import AccountSettingsForm from "@/components/account-settings-form";
import { getAccountDeletionStatus } from "@/lib/account/actions";
import { prisma } from "@/lib/prisma";
import { requireWorkspace } from "@/lib/workspaces/current";
import { redirect } from "next/navigation";

export default async function SettingsAccountPage() {
  const access = await requireWorkspace();
  if (!access.ok) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: access.workspace.user.id },
    select: { name: true, email: true },
  });

  if (!user) {
    redirect("/login");
  }

  const deletion = await getAccountDeletionStatus();
  if (!deletion.ok) {
    return (
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Account
        </h1>
        <p className="text-sm text-destructive">{deletion.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Account
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal profile. Ownership transfer uses the active
          workspace (
          <span className="text-foreground">{access.workspace.name}</span>
          ).
        </p>
      </div>
      <AccountSettingsForm
        key={`${access.workspace.id}-${deletion.data.blockers.length}-${deletion.data.transferCandidates.length}`}
        initialName={user.name}
        email={user.email}
        deletion={deletion.data}
      />
    </div>
  );
}
