"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function PendingMark() {
  const { pending } = useLinkStatus();
  return <i className={`nav-pending-mark ${pending ? "is-pending" : ""}`} aria-hidden="true" />;
}

export function NavigationLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const current = href === "/" ? pathname === href : pathname.startsWith(href);
  return (
    <Link href={href} aria-current={current ? "page" : undefined}>
      <span>{children}</span>
      <PendingMark />
    </Link>
  );
}
