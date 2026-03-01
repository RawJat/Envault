import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);

    const title = searchParams.get("title")?.slice(0, 100) || "Envault";
    const description =
      searchParams.get("description")?.slice(0, 200) ||
      "Secure Environment Variable Management";
    const rawSection = searchParams.get("section")?.slice(0, 50);
    const section = rawSection || "Envault";

    const isDocs = section.toLowerCase().includes("docs");

    // Pre-fetch landing page fonts for Edge OG Renderer
    const [interFont, serifFont, monoFont] = await Promise.all([
      fetch(
        "https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf",
      ).then((res) => res.arrayBuffer()),
      fetch(
        "https://fonts.gstatic.com/s/instrumentserif/v5/jizBRFtNs2ka5fXjeivQ4LroWlx-2zI.ttf",
      ).then((res) => res.arrayBuffer()),
      fetch(
        "https://fonts.gstatic.com/s/jetbrainsmono/v24/tDbY2o-flEEny0FZhsfKu5WU4zr3E_BX0PnT8RD8yKxjPQ.ttf",
      ).then((res) => res.arrayBuffer()),
    ]);

    // Exact Envault SVG Code Provided by User
    const EnvaultLogo = ({ size = 64, color = "currentColor" }) => (
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M49.9999 12.5L51.2291 9.625C50.8406 9.4588 50.4225 9.37311 49.9999 9.37311C49.5774 9.37311 49.1592 9.4588 48.7708 9.625L49.9999 12.5ZM49.9999 87.5L48.4499 90.2125C48.922 90.4822 49.4563 90.624 49.9999 90.624C50.5436 90.624 51.0778 90.4822 51.5499 90.2125L49.9999 87.5ZM48.7666 9.62916L22.1333 21.0417L24.5833 26.7917L51.2249 15.375L48.7666 9.62916ZM17.7083 27.7458V56.3292H23.9583V27.7458H17.7083ZM31.8791 80.7458L48.4499 90.2125L51.5499 84.7875L34.9791 75.3167L31.8791 80.7458ZM51.5499 90.2125L68.1208 80.7458L65.0208 75.3167L48.4499 84.7875L51.5499 90.2125ZM82.2916 56.325V27.75H76.0416V56.3333L82.2916 56.325ZM77.8749 21.0458L51.2291 9.62916L48.7708 15.3708L75.4124 26.7917L77.8749 21.0458ZM82.2916 27.75C82.2916 24.8333 80.5541 22.1958 77.8749 21.0458L75.4124 26.7917C75.5995 26.8724 75.7589 27.0062 75.8707 27.1765C75.9825 27.3468 76.0419 27.5462 76.0416 27.75H82.2916ZM68.1208 80.7458C72.4252 78.2861 76.003 74.7322 78.4916 70.4443C80.9802 66.1564 82.2911 61.2869 82.2916 56.3292H76.0416C76.0408 60.1845 75.021 63.9712 73.0857 67.3056C71.1503 70.64 68.368 73.4037 65.0208 75.3167L68.1208 80.7458ZM17.7083 56.3292C17.7087 61.2869 19.0196 66.1564 21.5082 70.4443C23.9968 74.7322 27.5746 78.2861 31.8791 80.7458L34.9791 75.3167C31.6312 73.4033 28.8486 70.639 26.9131 67.3038C24.9777 63.9686 23.9583 60.1811 23.9583 56.325L17.7083 56.3292ZM22.1249 21.0417C20.8141 21.6041 19.697 22.5385 18.912 23.7294C18.127 24.9203 17.7084 26.3195 17.7083 27.7458H23.9583C23.9583 27.3292 24.2083 26.95 24.5916 26.7833L22.1249 21.0417Z"
          fill={color}
        />
        <path
          d="M62.5 41.6667L45.8333 58.3334L37.5 50"
          stroke={color}
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );

    // Satori doesn't support complex imported React components like lucide-react perfectly on the edge.
    // It requires raw inline SVGs for perfect rendering.
    const ChevronRight = ({ color = "currentColor" }) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="m9 18 6-6-6-6" />
      </svg>
    );

    const Check = ({ color = "currentColor" }) => (
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );

    // Dynamic UI component that floating on the right based on context
    const FloatingUI = () => {
      if (isDocs) {
        // Render a Terminal window for Docs
        return (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              width: 500,
              background: "#0A0A0A",
              borderRadius: "20px",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 30px 80px rgba(0,0,0,0.8)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "16px 24px",
                borderBottom: "1px solid rgba(255,255,255,0.05)",
                background: "rgba(255,255,255,0.03)",
              }}
            >
              <div style={{ display: "flex", gap: "8px" }}>
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "#FF5F56",
                  }}
                />
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "#FFBD2E",
                  }}
                />
                <div
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: "50%",
                    background: "#27C93F",
                  }}
                />
              </div>
              <div
                style={{ display: "flex", flex: 1, justifyContent: "center" }}
              >
                <span
                  style={{
                    color: "#71717A",
                    fontSize: 16,
                    fontFamily: "monospace",
                  }}
                >
                  bash — ~
                </span>
              </div>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                padding: "32px",
                gap: "16px",
                fontFamily: "monospace",
                fontSize: 22,
                color: "#E4E4E7",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "12px" }}
              >
                <ChevronRight color="#22C55E" />
                <span>npm install -g envault-cli</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  opacity: 0.7,
                }}
              >
                <div style={{ width: 22 }}></div>
                <span style={{ color: "#71717A" }}>
                  added 1 package, and audited 3 packages in 1s
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "16px",
                }}
              >
                <ChevronRight color="#22C55E" />
                <span>envault login</span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  opacity: 0.7,
                }}
              >
                <Check color="#38BDF8" />
                <span style={{ color: "#38BDF8" }}>
                  Authenticated as Admin. Connecting to vault...
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  marginTop: "16px",
                }}
              >
                <ChevronRight color="#22C55E" />
                <span
                  style={{
                    borderRight: "10px solid #F2F2F0",
                    paddingRight: "4px",
                    animation: "blink 1s step-end infinite",
                  }}
                />
              </div>
            </div>
          </div>
        );
      }

      // Render a .env format editor for standard App Vault
      return (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: 500,
            background: "#0A0A0A",
            borderRadius: "20px",
            border: "1px solid rgba(255,255,255,0.15)",
            boxShadow:
              "0 40px 100px rgba(0,0,0,0.8), inset 0 1px 0 rgba(255,255,255,0.1)",
            overflow: "hidden",
            fontFamily: "JetBrains Mono",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "16px 24px",
              borderBottom: "1px solid rgba(255,255,255,0.05)",
              background: "rgba(255,255,255,0.03)",
            }}
          >
            <div style={{ display: "flex", gap: "8px" }}>
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "#FF5F56",
                }}
              />
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "#FFBD2E",
                }}
              />
              <div
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: "50%",
                  background: "#27C93F",
                }}
              />
            </div>
            <div style={{ display: "flex", flex: 1, justifyContent: "center" }}>
              <span
                style={{
                  color: "#71717A",
                  fontSize: 16,
                  fontFamily: "monospace",
                }}
              >
                .env.production
              </span>
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              padding: "32px",
              gap: "20px",
              fontFamily: "monospace",
              fontSize: 22,
            }}
          >
            <div style={{ display: "flex", alignItems: "center" }}>
              <span
                style={{ color: "#71717A", width: "30px", userSelect: "none" }}
              >
                1
              </span>
              <span style={{ color: "#38BDF8" }}>DATABASE_URL</span>
              <span style={{ color: "#F2F2F0" }}>=</span>
              <span style={{ color: "#A1A1AA" }}>postgres://v***</span>
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span
                style={{ color: "#71717A", width: "30px", userSelect: "none" }}
              >
                2
              </span>
              <span style={{ color: "#38BDF8" }}>ENCRYPTION_KEY</span>
              <span style={{ color: "#F2F2F0" }}>=</span>
              <span style={{ color: "#A1A1AA" }}>aes-256-gcm:***</span>
            </div>
            {/* Highlighted active line */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                background: "rgba(56, 189, 248, 0.1)",
                margin: "-8px -32px",
                padding: "8px 32px",
                borderLeft: "2px solid #38BDF8",
              }}
            >
              <span
                style={{ color: "#D4D4D8", width: "30px", userSelect: "none" }}
              >
                3
              </span>
              <span style={{ color: "#38BDF8" }}>STRIPE_SECRET</span>
              <span style={{ color: "#F2F2F0" }}>=</span>
              <span style={{ color: "#F2F2F0" }}>sk_live_51M***</span>
            </div>
            <div style={{ display: "flex", alignItems: "center" }}>
              <span
                style={{ color: "#71717A", width: "30px", userSelect: "none" }}
              >
                4
              </span>
              <span style={{ color: "#38BDF8" }}>RESEND_API_KEY</span>
              <span style={{ color: "#F2F2F0" }}>=</span>
              <span style={{ color: "#A1A1AA" }}>re_12345***</span>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: "10px",
                opacity: 0.5,
              }}
            >
              <span
                style={{ color: "#71717A", width: "30px", userSelect: "none" }}
              >
                5
              </span>
              <span style={{ color: "#71717A" }}>
                # End-to-end encrypted layer
              </span>
            </div>
          </div>
        </div>
      );
    };

    return new ImageResponse(
      <div
        style={{
          backgroundColor: "#050505", // Envault Void
          width: "100%",
          height: "100%",
          display: "flex",
          fontFamily: "Inter",
          position: "relative",
          overflow: "hidden",
          color: "#F2F2F0",
        }}
      >
        {/* Engineering / Blueprint Canvas Grid (Matches envault.tech aesthetic perfectly) */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
            zIndex: 0,
          }}
        />

        {/* Majestic Cinematic Spotlight Gradient (Clerk/Supabase style depth) */}
        <div
          style={{
            position: "absolute",
            left: "-10%",
            top: "-50%",
            width: "1000px",
            height: "1000px",
            background:
              "radial-gradient(circle, rgba(255,255,255,0.08) 0%, rgba(5,5,5,0) 70%)",
            zIndex: 0,
          }}
        />

        {/* Main Layout Container: Left (Typography) & Right (Visual Anchor) */}
        <div
          style={{
            display: "flex",
            width: "100%",
            height: "100%",
            padding: "70px 80px", // perfect golden ratio breathing room
            alignItems: "center",
            justifyContent: "space-between",
            zIndex: 10,
          }}
        >
          {/* Left Side: Staggered, Breathtaking Typography Block */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              flex: "1",
              paddingRight: "60px", // gap to right UI
              gap: "28px",
            }}
          >
            {/* Top Pill / Breadcrumb Structure */}
            <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
              <div
                style={{
                  display: "flex",
                  background: "#F2F2F0",
                  padding: "10px",
                  borderRadius: "14px",
                  boxShadow: "0 0 20px rgba(255,255,255,0.1)",
                }}
              >
                <EnvaultLogo size={28} color="#050505" />
              </div>
              <span
                style={{
                  fontSize: 32,
                  fontWeight: 800,
                  color: "#F2F2F0",
                  letterSpacing: "-0.02em",
                }}
              >
                Envault
              </span>
              <span
                style={{
                  color: "rgba(255,255,255,0.2)",
                  fontSize: 30,
                  padding: "0 4px",
                }}
              >
                /
              </span>
              <span
                style={{
                  fontSize: 26,
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.5)",
                  fontFamily: "monospace",
                  textTransform: "uppercase",
                }}
              >
                {section}
              </span>
            </div>

            {/* Massive Satori-optimized Display Title */}
            <h1
              style={{
                fontFamily: "Instrument Serif",
                fontSize: title.length > 20 ? 84 : 100, // scalable typography
                fontWeight: 800,
                color: "#FFFFFF",
                margin: 0,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
                textShadow: "0 10px 30px rgba(0,0,0,0.8)",
              }}
            >
              {title}
            </h1>

            {/* Muted Premium Subtitle */}
            <p
              style={{
                fontSize: 36,
                fontWeight: 500,
                color: "#A1A1AA", // zinc-400
                lineHeight: 1.5,
                margin: 0,
                maxWidth: "550px",
                display: "-webkit-box",
                WebkitLineClamp: 3,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
              }}
            >
              {description}
            </p>

            {/* Subtle Tech-Brand Footer */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                marginTop: "16px",
                paddingTop: "32px",
                borderTop: "1px solid rgba(255,255,255,0.1)",
                width: "100%",
                maxWidth: "500px",
              }}
            >
              <span
                style={{
                  color: "#71717A",
                  fontSize: 24,
                  fontWeight: 600,
                  letterSpacing: "0.1em",
                }}
              >
                envault.tech
              </span>
            </div>
          </div>

          {/* Right Side: Supabase / Fumadocs style Visual Screenshot / Interface Mock */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-end",
              justifyContent: "center",
            }}
          >
            <FloatingUI />
          </div>
        </div>
      </div>,
      {
        width: 1200,
        height: 630,
        fonts: [
          {
            name: "Inter",
            data: interFont,
            style: "normal",
          },
          {
            name: "Instrument Serif",
            data: serifFont,
            style: "normal",
          },
          {
            name: "JetBrains Mono",
            data: monoFont,
            style: "normal",
          },
        ],
      },
    );
  } catch (e: unknown) {
    console.error("Error generating OG image:", e);
    return new Response(`Failed to generate the image`, {
      status: 500,
    });
  }
}
