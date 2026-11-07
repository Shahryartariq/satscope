import Link from "next/link";
import { ADDRESS_TYPE_LABEL, shortAddress } from "@/lib/address";
import {
  formatBtc,
  formatCount,
  formatRate,
  formatRuneAmount,
  formatSats,
  formatUsd,
  outpoint,
  relativeTime,
} from "@/lib/format";
import { mempoolAddress, mempoolTx, ordinalsInscription } from "@/lib/site";
import type { CoinKind, Report } from "@/lib/types";
import { CopyButton } from "../CopyButton";
import { CoinMap, KIND_LABEL, Legend } from "../CoinMap";
import { coinAnchor, Findings } from "./Findings";
import { FixPanel } from "./FixPanel";
import { ScoreDial } from "./ScoreDial";

const ROLE_LABEL = { ordinals: "Ordinals address", payment: "Payment address", single: "Address" } as const;
const TABLE_LIMIT = 500;

function coinLabel(c: Report["coins"][number]): string {
  const bits = [`${formatSats(c.value)}`, KIND_LABEL[c.kind]];
  if (c.inscriptions.length > 1) bits.push(`${c.inscriptions.length} inscriptions`);
  if (c.runes.length) bits.push(c.runes.map((r) => r.name).join(", "));
  if (!c.confirmed) bits.push("unconfirmed");
  return bits.join(": ");
}

export function ReportView({ report }: { report: Report }) {
  const { totals, market } = report;
  const multi = report.addresses.length > 1;
  const kindsPresent = (["clean", "inscribed", "runic", "mixed", "uneconomical", "unverified"] as CoinKind[]).filter(
    (k) => report.coins.some((c) => c.kind === k),
  );
  const inscribed = report.coins.filter((c) => c.inscriptions.length > 0);
  const runeTotals = new Map<
    string,
    { name: string; symbol: string; divisibility: number; amount: bigint; coins: number }
  >();
  for (const s of report.addresses) {
    for (const r of s.runeBalances) {
      const cur = runeTotals.get(r.id);
      runeTotals.set(r.id, {
        name: r.name,
        symbol: r.symbol,
        divisibility: r.divisibility,
        amount: (cur?.amount ?? 0n) + (/^\d+$/.test(r.amount) ? BigInt(r.amount) : 0n),
        coins: report.coins.filter((c) => c.runes.some((x) => x.id === r.id)).length,
      });
    }
  }
  const spendPct = totals.sats ? totals.spendableSats / totals.sats : 0;
  const usd = (s: number) => formatUsd(s, market.usd);

  return (
    <>
      <section className="report-head wrap" aria-labelledby="report-title">
        <p className="crumbs">
          <Link href="/">Satscope</Link> / Wallet checkup
        </p>
        <h1 id="report-title">
          {multi ? "Wallet checkup" : `Checkup for ${shortAddress(report.addresses[0]!.address)}`}
        </h1>
        {report.addresses.map((a) => (
          <div className="addr-line" key={a.address}>
            {multi ? <span className="chip">{ROLE_LABEL[a.role]}</span> : null}
            <span className="chip">{ADDRESS_TYPE_LABEL[a.type]}</span>
            <span className="addr">{a.address}</span>
            <CopyButton text={a.address} label="Copy address" />
            <a className="muted" href={mempoolAddress(a.address)} rel="noopener noreferrer" target="_blank">
              View on mempool.space
            </a>
          </div>
        ))}
      </section>

      <div className="wrap report-body">
        {!report.indexed ? (
          <p className="notice" role="status">
            Ordinals and Runes weren&apos;t checked for {multi ? "every address" : "this address"} because the Ordinals
            index didn&apos;t answer. The bitcoin figures are complete; treat small coins with care until you can check
            again.
          </p>
        ) : null}

        <div className="summary-grid">
          <section className="panel" aria-label="Health score">
            {report.scored ? (
              <ScoreDial score={report.score} grade={report.grade} />
            ) : (
              <div className="score unscored">
                <h2 className="score-verdict">Too large to score</h2>
                <p className="muted">
                  This address has more coins than Satscope reads one by one, so there is no health score. The balance
                  comes from its full history.
                </p>
              </div>
            )}
          </section>
          <section className="panel" aria-labelledby="totals-title">
            <h2 id="totals-title" className="sr-only">
              Totals
            </h2>
            <dl className="totals">
              <div className="total">
                <dt>Balance</dt>
                <dd>
                  {formatBtc(totals.sats)}
                  <small>{usd(totals.sats) ?? formatSats(totals.sats)}</small>
                </dd>
              </div>
              <div className="total">
                <dt>Coins</dt>
                <dd>
                  {report.scored ? totals.coins.toLocaleString("en-US") : "Too many"}
                  <small>{report.scored ? "unspent outputs" : "to list one by one"}</small>
                </dd>
              </div>
              <div className="total">
                <dt>Inscriptions</dt>
                <dd>
                  {report.indexed || totals.inscriptions ? totals.inscriptions.toLocaleString("en-US") : "Not checked"}
                  <small>
                    {inscribed.length
                      ? formatCount(inscribed.length, "coin")
                      : report.indexed
                        ? "none found"
                        : "index unavailable"}
                  </small>
                </dd>
              </div>
              <div className="total">
                <dt>Runes</dt>
                <dd>
                  {report.indexed || totals.runeKinds ? totals.runeKinds.toLocaleString("en-US") : "Not checked"}
                  <small>
                    {totals.runeKinds ? "different tokens" : report.indexed ? "none found" : "index unavailable"}
                  </small>
                </dd>
              </div>
            </dl>
            <div className="split-bar">
              <svg viewBox="0 0 1000 12" preserveAspectRatio="none" aria-hidden="true">
                <rect x="0" y="0" width="1000" height="12" rx="6" className="rest" />
                {totals.sats > 0 ? (
                  <>
                    <rect x="0" y="0" width={Math.max(0, 1000 * spendPct)} height="12" rx="6" className="spendable" />
                    <rect
                      x={1000 * spendPct}
                      y="0"
                      width={Math.max(0, 1000 * (totals.protectedSats / totals.sats))}
                      height="12"
                      className="protected"
                    />
                  </>
                ) : null}
              </svg>
              <p>
                <span>
                  <span className="kind-dot kd-clean" aria-hidden="true" />
                  Spendable {formatBtc(totals.spendableSats)}
                </span>
                <span>
                  <span className="kind-dot kd-inscribed" aria-hidden="true" />
                  {report.indexed ? "Holding inscriptions or Runes" : "Check first"} {formatBtc(totals.protectedSats)}
                </span>
              </p>
            </div>
          </section>
        </div>

        <section className="panel" aria-labelledby="findings-title">
          <div className="panel-title">
            <h2 id="findings-title">What we found</h2>
            <p>{report.findings.length ? formatCount(report.findings.length, "finding") : ""}</p>
          </div>
          <Findings findings={report.findings} multiAddress={multi} />
        </section>

        {report.scored && report.coins.length > 0 ? (
          <FixPanel
            addresses={report.addresses.map((a) => ({
              address: a.address,
              type: a.type,
              role: a.role,
              indexed: a.indexed,
            }))}
            coins={report.coins.map((c) => ({
              txid: c.txid,
              vout: c.vout,
              value: c.value,
              address: c.address,
              kind: c.kind,
              confirmed: c.confirmed,
              inscriptions: c.inscriptions.length,
              runes: c.runes.map((r) => r.name),
            }))}
            fees={market.fees}
            usd={market.usd}
          />
        ) : null}

        {report.coins.length > 0 ? (
          <section className="panel" aria-labelledby="map-title">
            <div className="panel-title">
              <h2 id="map-title">Every coin, to scale</h2>
              <p>Size follows value (log scale)</p>
            </div>
            <CoinMap
              title={`Map of ${totals.coins} coins: ${kindsPresent.map((k) => `${report.coins.filter((c) => c.kind === k).length} ${KIND_LABEL[k].toLowerCase()}`).join(", ")}`}
              coins={report.coins.map((c) => ({
                key: outpoint(c),
                value: c.value,
                kind: c.kind,
                label: coinLabel(c),
                href: `#${coinAnchor(outpoint(c))}`,
              }))}
              idPrefix="report"
            />
            <Legend kinds={kindsPresent} />
          </section>
        ) : (
          <section className="panel empty">
            <h2>No coins here</h2>
            <p className="muted">
              {report.addresses.some((a) => a.tooManyCoins)
                ? "This address has more coins than Satscope reads."
                : "This address holds no bitcoin right now. If you just sent some, wait for the transaction to show up and check again."}
            </p>
          </section>
        )}

        {inscribed.length > 0 || runeTotals.size > 0 ? (
          <div className="cols">
            {inscribed.length > 0 ? (
              <section className="panel" aria-labelledby="ins-title">
                <div className="panel-title">
                  <h2 id="ins-title">Inscriptions</h2>
                  <p>{formatCount(totals.inscriptions, "inscription")}</p>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Inscription</th>
                        <th scope="col" className="num">
                          Sats on the coin
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {inscribed.flatMap((c) =>
                        c.inscriptions.map((i) => (
                          <tr key={i.id}>
                            <td>
                              <a href={ordinalsInscription(i.id)} rel="noopener noreferrer" target="_blank">
                                {i.number != null ? (
                                  `#${i.number.toLocaleString("en-US")}`
                                ) : (
                                  <span className="mono">
                                    {i.id.slice(0, 10)}…{i.id.slice(-4)}
                                  </span>
                                )}
                              </a>
                              {multi && c.role === "payment" ? (
                                <span className="chip chip-warn"> in payment address</span>
                              ) : null}
                            </td>
                            <td className="num">{c.value.toLocaleString("en-US")}</td>
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
            {runeTotals.size > 0 ? (
              <section className="panel" aria-labelledby="runes-title">
                <div className="panel-title">
                  <h2 id="runes-title">Runes</h2>
                  <p>{formatCount(runeTotals.size, "token")}</p>
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Rune</th>
                        <th scope="col" className="num">
                          Amount
                        </th>
                        <th scope="col" className="num">
                          Coins
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {[...runeTotals].map(([id, r]) => (
                        <tr key={id}>
                          <td>
                            {r.symbol ? <span aria-hidden="true">{r.symbol} </span> : null}
                            {r.name}
                          </td>
                          <td className="num">{formatRuneAmount(r.amount.toString(), r.divisibility)}</td>
                          <td className="num">{r.coins}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ) : null}
          </div>
        ) : null}

        {report.consolidation ? (
          <section className="panel" aria-labelledby="merge-title">
            <div className="panel-title">
              <h2 id="merge-title">Merging your spendable coins</h2>
              <p>Estimate, not advice</p>
            </div>
            <dl className="totals">
              <div className="total">
                <dt>Coins to merge</dt>
                <dd>
                  {report.consolidation.coinCount}
                  <small>{formatBtc(report.consolidation.totalSats)}</small>
                </dd>
              </div>
              <div className="total">
                <dt>Size</dt>
                <dd>
                  {report.consolidation.vbytes.toLocaleString("en-US")} vB
                  <small>one transaction</small>
                </dd>
              </div>
              <div className="total">
                <dt>Fee today</dt>
                <dd>
                  {formatSats(report.consolidation.costNow)}
                  <small>at {formatRate(report.consolidation.rateNow)}</small>
                </dd>
              </div>
              <div className="total">
                <dt>Fee on a busy day</dt>
                <dd>
                  {formatSats(report.consolidation.costBusy)}
                  <small>at {formatRate(report.consolidation.rateBusy)}</small>
                </dd>
              </div>
            </dl>
          </section>
        ) : null}

        {report.coins.length > 0 ? (
          <section className="panel" aria-labelledby="coins-title">
            <div className="panel-title">
              <h2 id="coins-title">All coins</h2>
              <p>
                {report.coins.length > TABLE_LIMIT
                  ? `Largest ${TABLE_LIMIT} of ${report.coins.length}`
                  : formatCount(report.coins.length, "coin")}
              </p>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th scope="col">Coin</th>
                    <th scope="col">Holds</th>
                    <th scope="col" className="num">
                      Value
                    </th>
                    <th scope="col" className="num">
                      Fee to spend
                    </th>
                    <th scope="col">Received</th>
                    {multi ? <th scope="col">Address</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {report.coins.slice(0, TABLE_LIMIT).map((c) => {
                    const op = outpoint(c);
                    return (
                      <tr key={op} id={coinAnchor(op)}>
                        <td>
                          <a className="mono" href={mempoolTx(c.txid)} rel="noopener noreferrer" target="_blank">
                            {c.txid.slice(0, 8)}…:{c.vout}
                          </a>
                        </td>
                        <td>
                          <span className={`kind-dot kd-${c.kind}`} aria-hidden="true" />
                          {KIND_LABEL[c.kind]}
                          {c.runes.length ? ` (${c.runes.map((r) => r.name).join(", ")})` : ""}
                        </td>
                        <td className="num">{c.value.toLocaleString("en-US")}</td>
                        <td className="num">{c.spendCost.toLocaleString("en-US")}</td>
                        <td>{c.confirmed ? (c.time ? relativeTime(c.time) : `block ${c.height}`) : "Unconfirmed"}</td>
                        {multi ? <td>{ROLE_LABEL[c.role]}</td> : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        <section className="panel" aria-labelledby="fees-title">
          <div className="panel-title">
            <h2 id="fees-title">Network fees right now</h2>
            <p>
              {market.usd
                ? `BTC ${market.usd.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 })}`
                : ""}
              {market.tipHeight ? ` at block ${market.tipHeight.toLocaleString("en-US")}` : ""}
            </p>
          </div>
          <dl className="fee-strip">
            <div>
              <dt>Next block</dt>
              <dd>{formatRate(market.fees.fastest)}</dd>
            </div>
            <div>
              <dt>Half an hour</dt>
              <dd>{formatRate(market.fees.halfHour)}</dd>
            </div>
            <div>
              <dt>An hour</dt>
              <dd>{formatRate(market.fees.hour)}</dd>
            </div>
            <div>
              <dt>No rush</dt>
              <dd>{formatRate(market.fees.economy)}</dd>
            </div>
          </dl>
          <p className="muted small-note">
            Fee-to-spend figures in this report use the no-rush rate. Checked{" "}
            {new Date(report.generatedAt).toUTCString()}.
          </p>
        </section>
      </div>
    </>
  );
}
