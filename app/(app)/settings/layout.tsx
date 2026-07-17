import { SettingsSideNav } from "@/components/settings-side-nav";
import { requireWorkspace } from "@/lib/workspaces/current";
import { redirect } from "next/navigation";

export default async function SettingsLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const access = await requireWorkspace();
  if (!access.ok) {
    redirect("/login");
  }

  const workspaceName = access.workspace.name;

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <aside
        className="w-52 shrink-0 border-r p-4"
        aria-label="Settings"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Settings
        </p>
        <p
          className="mb-3 truncate text-xs text-muted-foreground"
          title={workspaceName}
        >
          {workspaceName}
        </p>
        <SettingsSideNav />
      </aside>
      <div className="min-h-0 flex-1 overflow-auto p-6">{children}</div>
    </div>
  );
}
