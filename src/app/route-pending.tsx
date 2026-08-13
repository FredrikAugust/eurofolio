import { PageHeading } from "@/app/app-frame";

const pendingRows = ["A", "B", "C"];

export function OverviewPending() {
  return (
    <div className="route-pending" aria-busy="true" aria-label="Loading portfolio valuation">
      <section className="pending-value-field">
        <span>Eurofolio</span>
        <strong>Loading valuation</strong>
        <small>Preparing current register</small>
      </section>
      <section className="pending-register" aria-hidden="true">
        {pendingRows.map((row) => <i key={row} />)}
      </section>
    </div>
  );
}

export function PagePending({ title }: { title: string }) {
  return (
    <div className="route-pending" aria-busy="true" aria-label={`Loading ${title.toLowerCase()}`}>
      <PageHeading title={title} facts={[
        { label: "Status", value: "Loading" },
        { label: "Register", value: "Preparing" },
        { label: "Source", value: "Portfolio" },
      ]} />
      <section className="pending-register" aria-hidden="true">
        {pendingRows.map((row) => <i key={row} />)}
      </section>
    </div>
  );
}
