export function Hero() {
  return (
    <section className="relative overflow-hidden rounded-card bg-gradient-to-br from-[#0b3d2a] via-[#0c6b43] to-[#0eb366] px-8 py-12 text-white sm:px-12 sm:py-16">
      {/* Decorative geometric facets */}
      <div className="pointer-events-none absolute inset-0 opacity-30">
        <div className="absolute -right-10 top-4 h-48 w-48 rotate-12 rounded-3xl bg-white/10 blur-2xl" />
        <div className="absolute right-24 -bottom-12 h-56 w-56 -rotate-6 rounded-3xl bg-emerald-300/20 blur-2xl" />
        <svg
          className="absolute right-6 top-1/2 hidden h-40 w-40 -translate-y-1/2 text-white/20 sm:block"
          viewBox="0 0 32 32"
          fill="currentColor"
        >
          <path d="M16 2L24 10L16 18L8 10L16 2Z" />
          <path d="M16 14L24 22L16 30L8 22L16 14Z" opacity="0.6" />
        </svg>
      </div>
      <div className="relative">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          KUB Node Info
        </h1>
        <p className="mt-2 max-w-xl text-sm text-emerald-50/90 sm:text-base">
          Live validator &amp; node information on the KUB Chain — Proof of
          Stake.
        </p>
      </div>
    </section>
  );
}
