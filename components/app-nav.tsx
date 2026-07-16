import { auth } from "@/auth";
import NavMenu from "@/components/nav-menu";

export default async function AppNav() {
  const session = await auth();
  return (
    <NavMenu
      user={
        session?.user
          ? { name: session.user.name, email: session.user.email }
          : null
      }
    />
  );
}
