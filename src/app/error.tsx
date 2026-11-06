"use client";

import Link from "next/link";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="wrap prose">
      <h1>Something went wrong</h1>
      <p>The page hit an unexpected error. Try again, and if it keeps happening, go back to the home page.</p>
      <div className="actions-row">
        <button type="button" className="btn btn-primary" onClick={reset}>
          Try again
        </button>
        <Link className="btn btn-quiet" href="/">
          Home
        </Link>
      </div>
    </section>
  );
}
