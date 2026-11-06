import { shortAddress } from "@/lib/address";
import { shortOutpoint } from "@/lib/format";
import type { Finding, Severity } from "@/lib/types";

const SEV_LABEL: Record<Severity, string> = { high: "High risk", medium: "Medium", low: "Low", info: "Note" };

export function coinAnchor(op: string): string {
  return `coin-${op.replace(":", "-")}`;
}

export function Findings({ findings, multiAddress }: { findings: Finding[]; multiAddress: boolean }) {
  if (findings.length === 0) {
    return (
      <div className="all-clear">
        <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
          <circle cx="14" cy="14" r="13" fill="none" stroke="currentColor" strokeWidth="2" />
          <path
            d="M8 14.5l4 4 8-9"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Nothing to fix. No inscriptions or Runes at risk, and no costly coins.
      </div>
    );
  }
  return (
    <ol className="findings">
      {findings.map((f) => (
        <li key={`${f.id}-${f.address ?? "all"}`} className={`finding sev-${f.severity}`}>
          <span className="sev">{SEV_LABEL[f.severity]}</span>
          <h3>{f.title}</h3>
          {multiAddress && f.address ? <p className="addr">{shortAddress(f.address, 10)}</p> : null}
          <p>{f.detail}</p>
          {f.action ? <p className="action">{f.action}</p> : null}
          {f.coins && f.coins.length > 0 ? (
            <details>
              <summary>{f.coins.length === 1 ? "Show the coin" : `Show the ${f.coins.length} coins`}</summary>
              <ul>
                {f.coins.slice(0, 50).map((op) => (
                  <li key={op}>
                    <a href={`#${coinAnchor(op)}`} className="mono">
                      {shortOutpoint(op)}
                    </a>
                  </li>
                ))}
                {f.coins.length > 50 ? <li className="muted">and {f.coins.length - 50} more in the table</li> : null}
              </ul>
            </details>
          ) : null}
        </li>
      ))}
    </ol>
  );
}
