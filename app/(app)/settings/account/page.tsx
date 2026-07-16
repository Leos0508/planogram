import AccountSettingsForm from "@/components/account-settings-form";
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

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="font-heading text-2xl font-semibold tracking-tight">
          Account
        </h1>
        <p className="text-sm text-muted-foreground">
          Manage your personal profile.
        </p>
      </div>
      <AccountSettingsForm initialName={user.name} email={user.email} />
    </div>
  );
}
