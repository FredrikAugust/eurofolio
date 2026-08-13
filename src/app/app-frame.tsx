import Link from "next/link";
import type { ReactNode } from "react";

import { logout } from "@/app/actions";

const navigation = [
  { href: "/", label: "Overview", short: "Overview" },
  { href: "/holdings", label: "Holdings", short: "Holdings" },
  { href: "/history", label: "History", short: "History" },
  { href: "/activity", label: "Activity", short: "Activity" },
  { href: "/data", label: "Data", short: "Data" },
] as const;

export type PortfolioPage = (typeof navigation)[number]["label"];

export function AppFrame({ current, children }: { current: PortfolioPage; children: ReactNode }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link href="/" className="topbar-brand">Eurofolio</Link>
        <nav aria-label="Portfolio navigation">
          {navigation.map((item) => <Link href={item.href} aria-current={item.label === current ? "page" : undefined} key={item.href}>{item.label}</Link>)}
        </nav>
        <form action={logout}><button type="submit">Sign out</button></form>
      </header>
      <main className="quotation-sheet">
        <i className="crop-mark crop-ne" aria-hidden="true" />
        <i className="crop-mark crop-sw" aria-hidden="true" />
        {children}
      </main>
      <footer><span>EUR / SINGLE OWNER / DELAYED MARKET DATA</span><span>Not investment advice</span></footer>
      <nav className="mobile-nav" aria-label="Portfolio navigation">
        {navigation.map((item) => <Link href={item.href} aria-current={item.label === current ? "page" : undefined} key={item.href}>{item.short}</Link>)}
      </nav>
    </div>
  );
}

export function PageHeading({ title, measure, facts }: { title: string; measure: string; facts: { label: string; value: string }[] }) {
  return (
    <>
      <div className="measure-axis" aria-hidden="true"><span>{measure}</span><span>75</span><i /><span>100</span><span>125</span><span>150</span></div>
      <header className="page-heading">
        <h1>{title}</h1>
        <dl>{facts.map((fact) => <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>)}</dl>
      </header>
    </>
  );
}
