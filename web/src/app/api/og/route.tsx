import { ImageResponse } from "next/og";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get("title") || "HonePrompt";
  const subtitle =
    searchParams.get("subtitle") || "Autonomous Prompt Optimizer";

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "flex-start",
          width: "100%",
          height: "100%",
          padding: "80px",
          backgroundColor: "#FEFBF6",
          fontFamily: "serif",
        }}
      >
        {/* Accent bar */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "8px",
            backgroundColor: "#C2410C",
          }}
        />

        {/* Title */}
        <div
          style={{
            display: "flex",
            fontSize: 72,
            fontWeight: 700,
            color: "#1C1917",
            lineHeight: 1.1,
            marginBottom: "24px",
          }}
        >
          {title}
        </div>

        {/* Subtitle */}
        <div
          style={{
            display: "flex",
            fontSize: 36,
            color: "#78716C",
            lineHeight: 1.4,
            marginBottom: "48px",
          }}
        >
          {subtitle}
        </div>

        {/* Feature pills */}
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
          {["CLI + Web UI", "Model-Agnostic", "10 Templates", "MIT Licensed"].map(
            (label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  padding: "12px 24px",
                  backgroundColor: "#FFEDD5",
                  color: "#C2410C",
                  fontSize: 24,
                  borderRadius: "9999px",
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            )
          )}
        </div>

        {/* Score badge */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            position: "absolute",
            bottom: "80px",
            right: "80px",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              padding: "20px 32px",
              backgroundColor: "#C2410C",
              borderRadius: "16px",
              color: "#FFFFFF",
            }}
          >
            <div style={{ display: "flex", fontSize: 20, opacity: 0.8 }}>
              Score
            </div>
            <div style={{ display: "flex", fontSize: 48, fontWeight: 700 }}>
              55 → 82
            </div>
            <div style={{ display: "flex", fontSize: 18, opacity: 0.8 }}>
              15 iterations · $1.40
            </div>
          </div>
        </div>

        {/* npm install line */}
        <div
          style={{
            display: "flex",
            position: "absolute",
            bottom: "80px",
            left: "80px",
            fontSize: 22,
            color: "#78716C",
            fontFamily: "monospace",
          }}
        >
          npm install -g honeprompt
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
