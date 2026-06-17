import { ImageResponse } from "next/og";

export const alt = "KUB Node Info — KUB Chain Validators & Staking Explorer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          background: "#0b0e12",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="60" height="60" viewBox="0 0 32 32" fill="none">
            <path d="M4 10L16 17L16 29L4 22Z" fill="#0C9A57" />
            <path d="M28 10L16 17L16 29L28 22Z" fill="#0A7D47" />
            <path d="M16 3L4 10L16 17Z" fill="#2FD587" />
            <path d="M16 3L28 10L16 17Z" fill="#0EB366" />
          </svg>
          <div style={{ fontSize: 34, fontWeight: 700 }}>KUB Node Info</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 74, fontWeight: 700, lineHeight: 1.05 }}>
            KUB Chain Validators
          </div>
          <div
            style={{
              fontSize: 74,
              fontWeight: 700,
              lineHeight: 1.05,
              color: "#0EB366",
            }}
          >
            &amp; Staking Explorer
          </div>
          <div
            style={{
              fontSize: 30,
              color: "#9aa4af",
              marginTop: 28,
              maxWidth: 940,
            }}
          >
            Live stake, delegation, rewards &amp; commission — read from the
            StakeManager smart contract.
          </div>
        </div>

        <div style={{ display: "flex", fontSize: 26, color: "#0EB366" }}>
          KUB Chain · chainId 96
        </div>
      </div>
    ),
    { ...size },
  );
}
