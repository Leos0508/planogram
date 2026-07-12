import Link from "next/link";
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

const NavMenu = () => {
  return (
    <nav className="flex h-16 gap-2 w-full justify-end p-4 items-center border-b">
      {navItems.map((item) => (
        <Button key={item.href} variant="outline" size="sm" asChild>
          <Link href={item.href}>{item.label}</Link>
        </Button>
      ))}
    </nav>
  );
};

export default NavMenu;
