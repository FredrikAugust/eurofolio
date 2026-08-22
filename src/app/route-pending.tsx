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
