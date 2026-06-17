import { ImageResponse } from "next/og";
import { getValidatorByAddress } from "@/lib/staking";
import { formatKUBDisplay, bpsToPercent, shortenAddress } from "@/lib/format";

export const alt = "KUB Chain validator";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

function initials(name: string | null, address: string): string {
  if (name) {
    const parts = name.replace(/[^a-zA-Z0-9 ]/g, " ").trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  return address.slice(2, 4).toUpperCase();
}

const shell = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column" as const,
  padding: 80,
  background: "#0b0e12",
  color: "#ffffff",
  fontFamily: "sans-serif",
};

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        flex: 1,
        padding: "28px 32px",
        background: "#13181f",
        borderRadius: 16,
        border: "1px solid #232a33",
      }}
    >
      <div style={{ fontSize: 22, color: "#9aa4af" }}>{label}</div>
      <div style={{ fontSize: 44, fontWeight: 700, marginTop: 8 }}>{value}</div>
    </div>
  );
}

export default async function Image({
  params,
}: {
  params: Promise<{ address: string }>;
}) {
  const { address } = await params;
  const v = await getValidatorByAddress(address);

  if (!v) {
    return new ImageResponse(
      (
        <div style={{ ...shell, justifyContent: "center" }}>
          <div style={{ fontSize: 30, color: "#0EB366" }}>KUB Node Info</div>
          <div style={{ fontSize: 64, fontWeight: 700, marginTop: 16 }}>
            Node not found
          </div>
        </div>
      ),
      { ...size },
    );
  }

  const name = v.name ?? shortenAddress(v.address, 6);
  const kind = v.isPool ? "Pool Node" : "Solo Node";

  return new ImageResponse(
    (
      <div style={{ ...shell, justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              display: "flex",
              width: 96,
              height: 96,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 9999,
              background: "#0EB366",
              color: "#06241a",
              fontSize: 40,
              fontWeight: 700,
            }}
          >
            {initials(v.name, v.address)}
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 60, fontWeight: 700, lineHeight: 1.1 }}>
              {name}
            </div>
            <div style={{ display: "flex", gap: 14, marginTop: 10 }}>
              <div
                style={{
                  display: "flex",
                  fontSize: 24,
                  color: "#0EB366",
                  padding: "4px 16px",
                  borderRadius: 9999,
                  border: "1px solid #1f6b4c",
                }}
              >
                {kind}
              </div>
              <div
                style={{
                  display: "flex",
                  fontSize: 24,
                  color: "#9aa4af",
                  padding: "4px 16px",
                  borderRadius: 9999,
                  border: "1px solid #232a33",
                }}
              >
                {v.status}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 20 }}>
          <Stat
            label="Total Stake"
            value={`${formatKUBDisplay(v.totalStake)} KUB`}
          />
          <Stat label="Commission" value={bpsToPercent(v.commissionRate)} />
          <Stat
            label="Staking Power"
            value={`${(v.powerRatio * 100).toFixed(2)}%`}
          />
        </div>

        <div style={{ display: "flex", fontSize: 24, color: "#9aa4af" }}>
          KUB Node Info · KUB Chain validator · chainId 96
        </div>
      </div>
    ),
    { ...size },
  );
}
