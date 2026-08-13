"use client";

import Link, { useLinkStatus } from "next/link";
import type { ReactNode } from "react";

function PendingMark() {
  const { pending } = useLinkStatus();
  return <i className={`nav-pending-mark ${pending ? "is-pending" : ""}`} aria-hidden="true" />;
}

export function NavigationLink({
  href,
  current,
  children,
}: {
  href: string;
  current: boolean;
  children: ReactNode;
}) {
  return (
    <Link href={href} prefetch aria-current={current ? "page" : undefined}>
      <span>{children}</span>
      <PendingMark />
    </Link>
  );
}
