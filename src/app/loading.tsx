function Block({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-card bg-line/60 ${className}`} />;
}

export default function Loading() {
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:px-6 sm:py-8">
      <Block className="h-44 w-full" />
      <Block className="h-28 w-full" />
      <div className="rounded-card border border-line bg-white p-6">
        <Block className="h-6 w-40" />
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Block key={i} className="h-56 w-full" />
          ))}
        </div>
      </div>
    </div>
  );
}
