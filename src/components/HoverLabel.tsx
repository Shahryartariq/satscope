"use client";

import { useEffect, useRef, useState } from "react";

const DEFAULT = "Hover over a coin, or tab to it, to see what it holds.";

/** Shows the data-label of whichever coin the pointer or keyboard focus is on. */
export function HoverLabel({ id }: { id: string }) {
  const [text, setText] = useState(DEFAULT);
  const ref = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const root = ref.current?.closest(`[data-hover-root="${id}"]`);
    if (!root) return;
    const pick = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.("[data-label]");
      if (el) setText(el.getAttribute("data-label") ?? DEFAULT);
    };
    const reset = (e: Event) => {
      const next = (e as FocusEvent).relatedTarget as Element | null;
      if (!next || !root.contains(next)) setText(DEFAULT);
    };
    root.addEventListener("pointerover", pick);
    root.addEventListener("focusin", pick);
    root.addEventListener("pointerleave", reset);
    root.addEventListener("focusout", reset);
    return () => {
      root.removeEventListener("pointerover", pick);
      root.removeEventListener("focusin", pick);
      root.removeEventListener("pointerleave", reset);
      root.removeEventListener("focusout", reset);
    };
  }, [id]);

  return (
    <p className="hover-label" id={id} ref={ref}>
      {text}
    </p>
  );
}
