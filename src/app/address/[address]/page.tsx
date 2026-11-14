import type { Metadata } from "next";
import { pageMetadata } from "@/lib/seo";
import { headers } from "next/headers";
import { ProblemPage as Problem, visitorId } from "@/components/ProblemPage";
import { ReportView } from "@/components/report/ReportView";
import { permanentRedirect } from "next/navigation";
import { normalizeAddress, parseAddress, safeDecode, shortAddress } from "@/lib/address";
import { allowVisitor } from "@/lib/budget";
import { CheckupError, runCheckup } from "@/lib/checkup";

type Props = { params: Promise<{ address: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  const addr = normalizeAddress(safeDecode(address));
  const valid = parseAddress(addr);
  // Address reports are personal and endless: shareable, but kept out of search results.
  return pageMetadata({
    title: valid ? `Wallet checkup for ${shortAddress(addr)}` : "Address not recognised",
    description: "Bitcoin, Ordinals and Runes in this address, with risks and fee costs.",
    path: valid ? `/address/${addr}` : undefined,
    index: false,
  });
}

export default async function AddressPage({ params }: Props) {
  const { address } = await params;
  const raw = safeDecode(address);
  const addr = normalizeAddress(raw);

  if (!parseAddress(addr)) return <InvalidAddress />;
  // One URL per address: upper-case bech32, stray spaces and "bitcoin:" links go to the clean form.
  if (addr !== raw) permanentRedirect(`/address/${addr}`);

  const h = await headers();
  const visitor = visitorId(h);
  if (!allowVisitor(visitor))
    return (
      <Problem
        title="Slow down a little"
        text="You've run a lot of checkups in the last few minutes. Wait a moment and try again."
      />
    );

  try {
    const report = await runCheckup([{ address: addr, role: "single" }], visitor);
    return <ReportView report={report} />;
  } catch (err) {
    if (err instanceof CheckupError && err.kind === "invalid") return <InvalidAddress />;
    return (
      <Problem
        title="The checkup couldn't finish"
        text={
          err instanceof CheckupError
            ? err.message
            : "The Bitcoin data source isn't answering right now. Try again in a minute."
        }
      />
    );
  }
}

// The text never repeats what was in the URL, so a crafted link can't put its own words on the page.
function InvalidAddress() {
  return (
    <Problem
      title="That address isn't recognised"
      text="This isn't a valid Bitcoin mainnet address. Check it for missing or extra characters and try again."
    />
  );
}
