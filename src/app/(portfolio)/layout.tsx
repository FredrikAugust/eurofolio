import { connection } from "next/server";
import { Suspense, type ReactNode } from "react";

import { AppFrame } from "@/app/app-frame";
import { requireOwner } from "@/app/require-owner";
import { OverviewPending } from "@/app/route-pending";

export default function PortfolioLayout({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<AppFrame><OverviewPending /></AppFrame>}>
      <OwnerFrame>{children}</OwnerFrame>
    </Suspense>
  );
}

async function OwnerFrame({ children }: { children: ReactNode }) {
  await connection();
  await requireOwner();
  return <AppFrame>{children}</AppFrame>;
}
