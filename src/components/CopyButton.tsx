"use client";

import { useState } from "react";

export function CopyButton({
  text,
  label = "Copy",
  className = "btn btn-quiet btn-small",
}: {
  text: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked: leave the button as is */
    }
  }
  return (
    <button type="button" className={className} onClick={copy} aria-live="polite">
      {copied ? "Copied" : label}
    </button>
  );
}
