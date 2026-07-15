import { ImageResponse } from "next/og";

export const alt = "Valorandomizer — VALORANT Team Randomizer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#1a242e",
          color: "#f7f7f2",
          padding: "72px 84px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(135deg, rgba(255,70,85,0.22), transparent 42%), radial-gradient(circle at 85% 20%, rgba(255,70,85,0.18), transparent 28%)",
          }}
        />
        <div style={{ display: "flex", flexDirection: "column", gap: 18, zIndex: 1 }}>
          <div style={{ fontSize: 28, letterSpacing: 8, color: "#ff4655", fontWeight: 700 }}>
            VALORANDOMIZER
          </div>
          <div style={{ fontSize: 74, lineHeight: 1.04, fontWeight: 800, maxWidth: 920 }}>
            VALORANT Team Composition Randomizer
          </div>
        </div>
        <div style={{ display: "flex", gap: 22, fontSize: 30, zIndex: 1 }}>
          <span>RANDOM PICK</span>
          <span style={{ color: "#ff4655" }}>×</span>
          <span>PRO PICK</span>
        </div>
      </div>
    ),
    size,
  );
}
