import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-6 py-16 text-center">
      <h1 className="font-display text-3xl">Stranica ne postoji</h1>
      <Link href="/dashboard" className="mt-4 inline-block text-orange-300">Na naslovnicu</Link>
    </div>
  );
}
