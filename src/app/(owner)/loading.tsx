/**
 * Shown instantly while an owner page renders on the server. Also acts as the prefetch
 * boundary, so hovering links doesn't render whole pages in the background.
 */
export default function Loading() {
  return (
    <div role="status" aria-label="Loading" className="flex animate-pulse flex-col gap-6">
      <div className="flex flex-col gap-2 border-b pb-5">
        <div className="bg-card h-8 w-64 rounded-sm" />
        <div className="bg-card h-4 w-96 max-w-full rounded-sm" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="bg-card h-28 rounded-lg border" />
        ))}
      </div>
      <div className="bg-card h-72 rounded-lg border" />
    </div>
  );
}
