import { ImageResponse } from "next/og";

export const alt = "WOHKAH: staff management software for small businesses";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** Social sharing image (Open Graph / WhatsApp / X link previews). */
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        background: "#FAF8F2",
        padding: "64px 72px",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
        <div
          style={{
            width: 64,
            height: 64,
            borderRadius: 16,
            background: "#D69E00",
            color: "#2B1D18",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 40,
            fontWeight: 800,
          }}
        >
          W
        </div>
        <div style={{ fontSize: 44, fontWeight: 800, color: "#2B1D18", letterSpacing: -1 }}>
          WOHKAH
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div style={{ fontSize: 68, fontWeight: 800, color: "#2B1D18", lineHeight: 1.05 }}>
          Your staff, well managed.
        </div>
        <div style={{ fontSize: 32, color: "#78665B", lineHeight: 1.35, maxWidth: 950 }}>
          Staff records, attendance, salaries, leave, tasks and staff communication for small
          businesses. One simple platform.
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 24, color: "#78665B" }}>A product of Crift Concepts</div>
        <div
          style={{
            background: "#2B1D18",
            color: "#F4E8CF",
            fontSize: 26,
            fontWeight: 700,
            padding: "14px 26px",
            borderRadius: 12,
          }}
        >
          Start free
        </div>
      </div>
    </div>,
    { ...size },
  );
}
