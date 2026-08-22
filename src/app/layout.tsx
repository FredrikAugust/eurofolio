import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import type { ReactNode } from "react";
import "./globals.css";

const archivo = Archivo({
  subsets: ["latin"],
  variable: "--font-archivo",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Eurofolio",
  description: "A private, EUR-first portfolio overview.",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en" className={archivo.variable}>
      <body>
        <template
          data-direction-contract="6773e293"
          dangerouslySetInnerHTML={{
            __html: `<!--
THESIS: Eurofolio is a quotation specimen where numerical typography makes ownership legible; it refuses the rounded fintech KPI grid.
OWN-WORLD: Near-white proof stock, black ink, cadmium orange, cobalt blue, exposed baselines, crop marks, square rules, and one variable grotesk.
STORY: Read total and valuation date, compare three custodians, scan asset weights and ranked positions, then inspect history and the full register.
FIRST VIEWPORT: Brand and width scale above an oversized EUR total; date occupies the right gutter; accounts, allocation, top positions, and provenance lock to one measured sheet.
FORM: Quotation Specimen, grounded candidate 3, seed 6773e293; approved comp .impeccable/mocks/decision/challenger-specimen.png.
FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, and DESIGN.md
-->`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
