import type { ReactNode } from "react";

import { logout } from "@/app/actions";

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#portfolio-content">Skip to portfolio</a>
      <div className="quotation-sheet">
        <header className="register-nav">
          <strong className="register-nav-brand">Eurofolio</strong>
          <span>Private portfolio · EUR</span>
          <form action={logout}><button type="submit">Sign out</button></form>
        </header>
        <main id="portfolio-content">{children}</main>
      </div>
    </div>
  );
}
