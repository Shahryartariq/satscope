import type { Metadata } from "next";
import { headers } from "next/headers";
import { ProblemPage as Problem, visitorId } from "@/components/ProblemPage";
import { ReportView } from "@/components/report/ReportView";
import { allowVisitor } from "@/lib/budget";
import { CheckupError, parseTargets, runCheckup } from "@/lib/checkup";

export const metadata: Metadata = {
  title: "Wallet checkup",
  description: "Your Ordinals and payment addresses checked together.",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ o?: string | string[]; p?: string | string[] }> };

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.slice(0, 100);

export default async function WalletPage({ searchParams }: Props) {
  const sp = await searchParams;
  const targets = parseTargets({ ordinals: one(sp.o), payment: one(sp.p) });
  const h = await headers();
  const visitor = visitorId(h);

  let body: React.ReactNode;
  if (targets.length === 0) {
    body = <Problem title="Connect a wallet to check it" text="Connect your wallet, or paste an address." />;
  } else if (!allowVisitor(visitor)) {
    body = (
      <Problem
        title="Slow down a little"
        text="You've run a lot of checkups in the last few minutes. Wait a moment and try again."
      />
    );
  } else {
    try {
      body = <ReportView report={await runCheckup(targets)} />;
    } catch (err) {
      body = (
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
  return body;
}
