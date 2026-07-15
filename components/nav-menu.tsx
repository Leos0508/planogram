import Link from "next/link";
import { auth } from "@/auth";
import { signOutAction } from "@/lib/auth/actions";
import { Button } from "./ui/button";

const navItems = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Planograms",
    href: "/planograms",
  },
  {
    label: "SKUs",
    href: "/skus",
  },
];

export default async function NavMenu() {
  const session = await auth();

  return (
    <nav className="flex h-16 w-full items-center justify-end gap-2 border-b p-4">
      {navItems.map((item) => (
        <Button key={item.href} variant="outline" size="sm" asChild>
          <Link href={item.href}>{item.label}</Link>
        </Button>
      ))}
      {session?.user ? (
        <form action={signOutAction}>
          <Button type="submit" variant="outline" size="sm">
            Sign out
          </Button>
        </form>
      ) : (
        <Button variant="outline" size="sm" asChild>
          <Link href="/login">Sign in</Link>
        </Button>
      )}
    </nav>
  );
}
