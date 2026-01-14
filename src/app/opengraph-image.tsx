import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Fname Manager";
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background:
            "linear-gradient(to bottom right, #0a0a14, #16162d, #2c1f4a)",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(255, 255, 255, 0.03)",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            borderRadius: "50px",
            padding: "60px 100px",
            marginTop: "40px",
            marginBottom: "40px",
          }}
        >
          {/* Logo Area */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "120px",
              height: "120px",
              background: "rgba(147, 51, 234, 0.2)",
              borderRadius: "35px",
              marginBottom: "30px",
              overflow: "hidden",
            }}
          >
            <img
              src="https://imagedelivery.net/BXluQx4ige9GuW0Ia56BHw/40df36fe-c5dd-43c1-2784-0819526b4d00/original"
              width="120"
              height="120"
              alt="Logo"
              style={{ borderRadius: "35px" }}
            />
          </div>

          <div
            style={{
              fontSize: 96,
              fontWeight: 900,
              background:
                "linear-gradient(to right, #ffffff, #d8b4fe, #818cf8)",
              backgroundClip: "text",
              color: "transparent",
              marginBottom: 10,
              fontStyle: "italic",
              letterSpacing: "-0.05em",
            }}
          >
            Fname Manager
          </div>

          <div
            style={{
              fontSize: 34,
              color: "#a1a1aa",
              fontWeight: 500,
              textAlign: "center",
              maxWidth: 700,
              marginTop: 20,
            }}
          >
            A tool to change Farcaster usernames (fnames).
          </div>


        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
