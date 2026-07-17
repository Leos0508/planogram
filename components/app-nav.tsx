import { auth } from "@/auth";
import NavMenu from "@/components/nav-menu";
import { prisma } from "@/lib/prisma";
import { listMyWorkspaces } from "@/lib/workspaces/queries";

export default async function AppNav() {
  const session = await auth();
  if (!session?.user?.id) {
    return <NavMenu user={null} workspaces={[]} />;
  }

  const [user, workspacesResult] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { name: true, email: true },
    }),
    listMyWorkspaces(),
  ]);

  return (
    <NavMenu
      user={
        user
          ? { name: user.name, email: user.email }
          : {
              name: session.user.name,
              email: session.user.email,
            }
      }
      workspaces={workspacesResult.ok ? workspacesResult.data : []}
    />
  );
}
