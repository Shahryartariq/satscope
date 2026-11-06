"use client";

import { useEffect, useState } from "react";

type Theme = "system" | "light" | "dark";
const KEY = "satscope:theme";

function apply(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = theme;
}

const ICONS: Record<Theme, React.ReactNode> = {
  system: (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <rect x="1.5" y="2.5" width="13" height="9" rx="1.5" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path d="M5.5 14h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  ),
  light: (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <circle cx="8" cy="8" r="3" fill="none" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  ),
  dark: (
    <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true">
      <path
        d="M13.5 9.8A5.8 5.8 0 0 1 6.2 2.5a5.8 5.8 0 1 0 7.3 7.3Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  ),
};

export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>("system");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(KEY);
      if (saved === "light" || saved === "dark") setTheme(saved);
    } catch {
      /* storage blocked */
    }
    const onStorage = (e: StorageEvent) => {
      if (e.key !== KEY) return;
      const t: Theme = e.newValue === "light" || e.newValue === "dark" ? e.newValue : "system";
      setTheme(t);
      apply(t);
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function choose(t: Theme) {
    setTheme(t);
    apply(t);
    try {
      if (t === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, t);
    } catch {
      /* storage blocked */
    }
  }

  return (
    <fieldset className="theme-switch" aria-label="Colour theme">
      <legend className="sr-only">Colour theme</legend>
      {(["system", "light", "dark"] as const).map((t) => (
        <span key={t}>
          <input
            type="radio"
            id={`theme-${t}`}
            name="theme"
            value={t}
            checked={theme === t}
            onChange={() => choose(t)}
          />
          <label htmlFor={`theme-${t}`} title={t === "system" ? "Match system" : t === "light" ? "Light" : "Dark"}>
            {ICONS[t]}
            <span className="sr-only">{t === "system" ? "Match system" : t === "light" ? "Light" : "Dark"}</span>
          </label>
        </span>
      ))}
    </fieldset>
  );
}
