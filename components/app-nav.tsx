import NavMenu from "@/components/nav-menu";
import { requireSessionUser } from "@/lib/auth/session";
import { listMyWorkspaces } from "@/lib/workspaces/queries";

export default async function AppNav() {
  const session = await requireSessionUser();
  if (!session.ok) {
    return <NavMenu user={null} workspaces={[]} />;
  }

  const workspacesResult = await listMyWorkspaces();

  return (
    <NavMenu
      user={{
        name: session.user.name,
        email: session.user.email,
      }}
      workspaces={workspacesResult.ok ? workspacesResult.data : []}
    />
  );
}
