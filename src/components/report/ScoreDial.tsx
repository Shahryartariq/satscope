import Link from "next/link";
import type { Report } from "@/lib/types";

const VERDICT: Record<Report["grade"], string> = {
  A: "In good shape",
  B: "Mostly fine",
  C: "Worth a look",
  D: "Needs attention",
  F: "At risk",
};

export function ScoreDial({ score, grade }: { score: number; grade: Report["grade"] }) {
  const r = 70;
  const c = 2 * Math.PI * r;
  const filled = (score / 100) * c;
  return (
    <div className="score">
      <svg viewBox="0 0 168 168" role="img" aria-label={`Wallet health ${score} out of 100, grade ${grade}`}>
        <circle cx="84" cy="84" r={r} fill="none" strokeWidth="12" className="ring-bg" />
        {score > 0 ? (
          <circle
            cx="84"
            cy="84"
            r={r}
            fill="none"
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={`${filled} ${c}`}
            transform="rotate(-90 84 84)"
            className={`ring-${grade.toLowerCase()}`}
          />
        ) : null}
        <text x="84" y="96" textAnchor="middle" className="grade">
          {grade}
        </text>
        <text x="84" y="120" textAnchor="middle" className="out-of">
          {score} / 100
        </text>
      </svg>
      <div>
        <h2 className="score-verdict">{VERDICT[grade]}</h2>
        <p className="muted">
          <Link href="/about#score">How the score works</Link>
        </p>
      </div>
    </div>
  );
}
