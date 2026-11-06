import type { Metadata } from "next";
import { headers } from "next/headers";
import { ProblemPage as Problem, visitorId } from "@/components/ProblemPage";
import { ReportView } from "@/components/report/ReportView";
import { normalizeAddress, parseAddress, shortAddress } from "@/lib/address";
import { allowVisitor } from "@/lib/budget";
import { CheckupError, runCheckup } from "@/lib/checkup";

type Props = { params: Promise<{ address: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { address } = await params;
  const addr = normalizeAddress(decodeURIComponent(address));
  const valid = parseAddress(addr);
  return {
    title: valid ? `Wallet checkup for ${shortAddress(addr)}` : "Address not recognised",
    description: "Bitcoin, Ordinals and Runes in this address, with risks and fee costs.",
    // Address reports are personal and endless; keep them out of search results.
    robots: { index: false, follow: true },
    alternates: { canonical: `/address/${addr}` },
  };
}

export default async function AddressPage({ params }: Props) {
  const { address } = await params;
  const addr = normalizeAddress(decodeURIComponent(address));
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
    const report = await runCheckup([{ address: addr, role: "single" }]);
    return <ReportView report={report} />;
  } catch (err) {
    if (err instanceof CheckupError && err.kind === "invalid") {
      return (
        <Problem
          title="That address isn't recognised"
          text={`"${shortAddress(addr, 14)}" isn't a valid Bitcoin mainnet address. Check it and try again.`}
        />
      );
    }
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
