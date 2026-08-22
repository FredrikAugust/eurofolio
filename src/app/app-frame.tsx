import type { ReactNode } from "react";

import { logout } from "@/app/actions";

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <main className="quotation-sheet">
        <header className="register-nav">
          <strong className="register-nav-brand">Eurofolio</strong>
          <span>Private portfolio · EUR</span>
          <form action={logout}><button type="submit">Sign out</button></form>
        </header>
        {children}
      </main>
    </div>
  );
}
