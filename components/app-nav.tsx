import { auth } from "@/auth";
import NavMenu from "@/components/nav-menu";
import { prisma } from "@/lib/prisma";

export default async function AppNav() {
  const session = await auth();
  if (!session?.user?.id) {
    return <NavMenu user={null} />;
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, email: true },
  });

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
    />
  );
}
