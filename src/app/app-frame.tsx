import Link from "next/link";
import type { ReactNode } from "react";

import { logout } from "@/app/actions";
import { NavigationLink } from "@/app/navigation-link";

const navigation = [
  { href: "/", label: "Overview", short: "Overview" },
  { href: "/holdings", label: "Holdings", short: "Holdings" },
  { href: "/history", label: "History", short: "History" },
  { href: "/activity", label: "Activity", short: "Activity" },
  { href: "/data", label: "Data", short: "Data" },
] as const;

export function Chevron({ direction }: { direction: "right" | "down" }) {
  return (
    <svg className={`chevron chevron-${direction}`} viewBox="0 0 16 16" aria-hidden="true">
      <path d={direction === "right" ? "M5 3.5 9.5 8 5 12.5" : "M3.5 5.5 8 10l4.5-4.5"} />
    </svg>
  );
}

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <div className="app-shell">
      <main className="quotation-sheet">
        <header className="register-nav">
          <Link href="/" className="register-nav-brand">Eurofolio</Link>
          <nav aria-label="Portfolio navigation">
            {navigation.map((item) => <NavigationLink href={item.href} key={item.href}>{item.label}</NavigationLink>)}
          </nav>
          <form action={logout}><button type="submit">Sign out</button></form>
        </header>
        {children}
      </main>
      <footer><span>EUR / SINGLE OWNER / DELAYED MARKET DATA</span><span>Not investment advice</span></footer>
      <nav className="mobile-nav" aria-label="Portfolio navigation">
        {navigation.map((item) => <NavigationLink href={item.href} key={item.href}>{item.short}</NavigationLink>)}
      </nav>
    </div>
  );
}

export function PageHeading({ title, facts }: { title: string; facts: { label: string; value: string }[] }) {
  return (
    <header className="page-heading">
      <h1>{title}</h1>
      <dl>{facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
    </header>
  );
}
