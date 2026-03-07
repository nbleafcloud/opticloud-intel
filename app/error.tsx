"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-xs font-bold tracking-wider text-red-400 uppercase mb-3">
          Something went wrong
        </div>
        <p className="text-sm text-white/40 mb-6">
          {error.message || "An unexpected error occurred."}
        </p>
        <button
          onClick={reset}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70 transition hover:bg-white/10"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
