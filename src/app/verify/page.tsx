import type { Metadata } from "next";
import Link from "next/link";
import { CopyButton } from "@/components/CopyButton";
import { ADDRESS_TYPE_LABEL, normalizeAddress, parseAddress } from "@/lib/address";
import { decodeProof, encodeProof, parseProofMessage, validateProof, type Proof } from "@/lib/proof";
import { absoluteUrl } from "@/lib/site";
import { verifyProof } from "@/lib/verify";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const sp = await searchParams;
  const shared = Boolean(one(sp.p) || one(sp.s));
  return {
    title: shared ? "Bitcoin ownership proof" : "Verify a Bitcoin message signature",
    description:
      "Check a Bitcoin signed message: BIP-322 from Xverse, UniSat or Leather, and classic signatures from Electrum, Sparrow or Bitcoin Core.",
    alternates: { canonical: "/verify" },
    robots: shared ? { index: false, follow: false } : undefined,
  };
}

export default async function VerifyPage({ searchParams }: Props) {
  const sp = await searchParams;
  let proof: Proof | null = null;
  let parseError: string | null = null;

  if (one(sp.p)) {
    proof = decodeProof(one(sp.p));
    if (!proof) parseError = "This proof link is damaged or incomplete. Ask for the link again.";
  } else if (one(sp.a) || one(sp.m) || one(sp.s)) {
    proof = validateProof({ address: normalizeAddress(one(sp.a)), message: one(sp.m), signature: one(sp.s) });
    if (!proof) parseError = "Fill in all three fields. The signature should be base64 text, usually ending in =.";
  }

  const result = proof ? verifyProof(proof) : null;
  const meta = proof ? parseProofMessage(proof.message) : null;
  const type = proof ? parseAddress(proof.address) : null;
  const shareUrl = proof && result?.ok ? absoluteUrl(`/verify?p=${encodeProof(proof)}`) : null;
  const addressMatches = meta ? meta.address === proof?.address : true;

  return (
    <section className="wrap prose">
      <p className="crumbs">
        <Link href="/">Satscope</Link> / Verify a signature
      </p>
      <h1>{proof ? "Ownership proof" : "Verify a Bitcoin message signature"}</h1>

      {proof && result ? (
        <div className="panel verify-result" role="status">
          {result.ok && addressMatches ? (
            <p className="verdict ok big-verdict">
              <svg width="26" height="26" viewBox="0 0 18 18" aria-hidden="true">
                <circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path
                  d="M5 9.4l2.6 2.6L13 6.6"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              Signature is valid
            </p>
          ) : (
            <p className="verdict bad big-verdict">
              <svg width="26" height="26" viewBox="0 0 18 18" aria-hidden="true">
                <circle cx="9" cy="9" r="8" fill="none" stroke="currentColor" strokeWidth="1.6" />
                <path d="M6 6l6 6M12 6l-6 6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
              {result.ok ? "The message names a different address" : "Signature is not valid"}
            </p>
          )}
          {!result.ok ? <p>{result.reason}</p> : null}
          <dl className="proof-facts">
            <div>
              <dt>Address</dt>
              <dd className="addr">
                {proof.address}
                {type ? <span className="chip">{ADDRESS_TYPE_LABEL[type]}</span> : null}
              </dd>
            </div>
            {meta?.note ? (
              <div>
                <dt>Note</dt>
                <dd>{meta.note}</dd>
              </div>
            ) : null}
            {meta?.signedAt ? (
              <div>
                <dt>Signed</dt>
                <dd>{meta.signedAt.toUTCString()}</dd>
              </div>
            ) : null}
          </dl>
          <details>
            <summary>Show the signed message and signature</summary>
            <pre className="sig-block">{proof.message}</pre>
            <pre className="sig-block">{proof.signature}</pre>
          </details>
          {result.ok ? (
            <p className="muted small-note">
              A valid signature proves the signer controlled this address when it was made. It says nothing about who
              holds the keys today.
            </p>
          ) : null}
          <div className="actions-row">
            {shareUrl ? <CopyButton text={shareUrl} label="Copy proof link" className="btn btn-primary" /> : null}
            {type ? (
              <Link className="btn btn-quiet" href={`/address/${proof.address}`} prefetch={false}>
                Check this wallet
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}

      {parseError ? (
        <p className="form-error" role="alert">
          {parseError}
        </p>
      ) : null}

      {proof ? <h2>Check another signature</h2> : null}
      <p className={proof ? undefined : "lede"}>
        Works with BIP-322 signatures from Xverse, UniSat, Leather and other Ordinals wallets, and with classic
        &quot;signed message&quot; signatures from Electrum, Sparrow and Bitcoin Core.
      </p>
      <form className="stack verify-form" method="get" action="/verify">
        <div>
          <label htmlFor="a">Bitcoin address</label>
          <input
            id="a"
            name="a"
            className="field"
            autoComplete="off"
            spellCheck={false}
            required
            defaultValue={proof && !one(sp.p) ? proof.address : ""}
          />
        </div>
        <div>
          <label htmlFor="m">Message, exactly as signed</label>
          <textarea
            id="m"
            name="m"
            className="field"
            required
            defaultValue={proof && !one(sp.p) ? proof.message : ""}
          />
        </div>
        <div>
          <label htmlFor="s">Signature</label>
          <textarea
            id="s"
            name="s"
            className="field sig-field"
            spellCheck={false}
            required
            defaultValue={proof && !one(sp.p) ? proof.signature : ""}
          />
        </div>
        <div>
          <button type="submit" className="btn btn-primary">
            Verify signature
          </button>
        </div>
      </form>
    </section>
  );
}
