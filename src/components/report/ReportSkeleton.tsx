/**
 * Shown while a checkup runs. Report pages wait on mempool.space and UniSat
 * (a second or two when nothing is cached); without this, opening a shared
 * report link shows a blank page until every answer is in.
 */
export function ReportSkeleton() {
  return (
    <div aria-busy="true">
      <section className="report-head wrap">
        <p className="crumbs">Satscope / Wallet checkup</p>
        <h1>Checking this wallet</h1>
        <p className="muted" role="status">
          Reading coins, inscriptions and Runes. This usually takes a few seconds.
        </p>
      </section>
      <div className="wrap report-body">
        <div className="summary-grid">
          <div className="panel skeleton skeleton-short" />
          <div className="panel skeleton skeleton-short" />
        </div>
        <div className="panel skeleton skeleton-tall" />
        <div className="panel skeleton skeleton-tall" />
      </div>
    </div>
  );
}
