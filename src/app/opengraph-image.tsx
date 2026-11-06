import { ImageResponse } from "next/og";

export const alt = "Satscope: free Bitcoin wallet checkup for BTC, Ordinals and Runes";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const COINS: [number, number, number, string][] = [
  [820, 170, 70, "#a08dff"],
  [980, 150, 44, "#3cc790"],
  [1080, 250, 30, "#ef6eac"],
  [900, 330, 96, "#3cc790"],
  [1070, 410, 52, "#a08dff"],
  [790, 440, 36, "#e3b23f"],
  [960, 500, 24, "#a08dff"],
];

export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#0f151e",
        color: "#e8edf3",
        padding: "72px",
        fontFamily: "sans-serif",
        position: "relative",
      }}
    >
      {COINS.map(([x, y, r, c]) => (
        <div
          key={`${x}-${y}`}
          style={{
            position: "absolute",
            left: x - r,
            top: y - r,
            width: r * 2,
            height: r * 2,
            borderRadius: r,
            border: `4px solid ${c}`,
            background: `${c}33`,
          }}
        />
      ))}
      <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between", width: 640 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ width: 44, height: 44, borderRadius: 22, background: "#ff8a2a" }} />
          <div style={{ fontSize: 40, fontWeight: 700, letterSpacing: -1 }}>Satscope</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
          <div style={{ fontSize: 66, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
            Know what&apos;s in your Bitcoin wallet before you spend from it.
          </div>
          <div style={{ fontSize: 28, color: "#a9b4c3" }}>Free checkup for BTC, Ordinals and Runes</div>
        </div>
      </div>
    </div>,
    size,
  );
}
