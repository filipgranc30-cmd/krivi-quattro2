"use client";

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg px-6 py-16 text-center">
      <h1 className="font-display text-3xl">Nešto je zapelo</h1>
      <button type="button" className="mt-4 h-12 rounded-xl bg-orange-500 px-4 font-bold text-black" onClick={reset}>
        Pokušaj ponovno
      </button>
    </div>
  );
}
