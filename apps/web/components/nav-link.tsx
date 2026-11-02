"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {NavigationHint} from "./navigation-hint";
import { Icon, type IconName } from "./icons";
export function NavLink({
  href,
  label,
  icon,
  compact=false,
}: {
  href: string;
  label: string;
  icon: IconName;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const active = pathname === href || (href.endsWith("/professor/missoes") && pathname.startsWith(`${href}/`));
  return (
    <NavigationHint label={label} enabled={compact}><Link
      href={href}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={active ? "nav-current" : ""}
    >
      <Icon name={icon} />
      <span className="sidebar-label">{label}</span>
    </Link></NavigationHint>
  );
}
