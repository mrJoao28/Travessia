"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon, type IconName } from "./icons";
export function NavLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: IconName;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href.endsWith("/professor/missoes") && pathname.startsWith(`${href}/`));
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={active ? "nav-current" : ""}
    >
      <Icon name={icon} />
      {label}
    </Link>
  );
}
