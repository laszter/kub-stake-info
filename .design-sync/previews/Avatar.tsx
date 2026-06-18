import { Avatar } from "kub-stake-info";

// Validator avatars. With no logo (or a broken one) Avatar falls back to
// initials on a brand-light disc — the most common, fully deterministic state.
export const Initials = () => (
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
    <Avatar src={null} name="Bitkub Validator" address="0x8a3c2f1b9d4e5a6c7b8e9f0a1b2c3d4e5f6a7b8c" size={32} />
    <Avatar src={null} name="Stake Pool One" address="0x1f2e3d4c5b6a7980abcdef0123456789abcdef01" size={48} />
    <Avatar src={null} name="KUB Node" address="0xabc0000000000000000000000000000000000def" size={64} />
  </div>
);

// No name at all → first hex chars of the address.
export const AddressOnly = () => (
  <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
    <Avatar src={null} name={null} address="0x9f8e7d6c5b4a39281706abcd1234ef567890ab12" size={48} />
    <Avatar src={null} name={null} address="0x4d5e6f70819293a4b5c6d7e8f9a0b1c2d3e4f506" size={48} />
  </div>
);

// With a resolved logo, Avatar renders the image cropped to the disc.
export const WithLogo = () => {
  const logo =
    "data:image/svg+xml;utf8," +
    encodeURIComponent(
      "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='#0eb366'/><text x='32' y='42' font-size='28' font-family='sans-serif' fill='#06160d' text-anchor='middle' font-weight='700'>K</text></svg>",
    );
  return (
    <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
      <Avatar src={logo} name="KUB Validator" address="0x1234000000000000000000000000000000005678" size={48} />
      <Avatar src={logo} name="KUB Validator" address="0x1234000000000000000000000000000000005678" size={64} />
    </div>
  );
};
