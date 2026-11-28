import Link from "next/link";

export function TrainingNav({ current }: { current: "igre" | "dolasci" }) {
  const item = (id: "igre" | "dolasci", href: string, label: string) => (
    <Link href={href} className={`grid h-11 place-items-center rounded-lg text-sm font-bold ${current === id ? "bg-orange-500 text-black" : "text-zinc-300"}`}>
      {label}
    </Link>
  );
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-white/5 p-1">
      {item("igre", "/trening", "Igre")}
      {item("dolasci", "/trening/dolasci", "Dolazak na trening")}
    </div>
  );
}
