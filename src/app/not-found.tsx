import type { Metadata } from "next";
import Link from "next/link";
import { CheckForm } from "@/components/CheckForm";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <section className="wrap prose">
      <h1>This page doesn&apos;t exist</h1>
      <p>
        The link may be wrong or out of date. You can still check a wallet from here, or go back to the{" "}
        <Link href="/">home page</Link>.
      </p>
      <CheckForm />
    </section>
  );
}
