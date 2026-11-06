import Link from "next/link";
import { CheckForm } from "./CheckForm";

export function ProblemPage({ title, text }: { title: string; text: string }) {
  return (
    <section className="wrap prose">
      <p className="crumbs">
        <Link href="/">Satscope</Link> / Wallet checkup
      </p>
      <h1>{title}</h1>
      <p>{text}</p>
      <CheckForm />
    </section>
  );
}

export function visitorId(h: Headers): string {
  return h.get("x-real-ip") || h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
}
