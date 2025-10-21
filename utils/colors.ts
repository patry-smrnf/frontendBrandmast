export function gradientForShop(shopName?: string): string {
  if (!shopName) return "from-zinc-900 to-zinc-800";

  const map: Record<string, string> = {
    "Zabka": "from-emerald-950 via-zinc-900 to-zinc-900",
    "Carrefour": "from-orange-950 via-zinc-900 to-zinc-900",
    "Velo-Unconventional": "from-blue-950 via-zinc-900 to-zinc-900",
    "Duży ben": "from-rose-950 via-zinc-900 to-zinc-900",
    "Inmedio": "from-amber-950 via-zinc-900 to-zinc-900",
    "CircleK": "from-red-950 via-gray-400/20 to-zinc-900",
    "BP":"from-green-950 via-yellow-900/20 to-zinc-900",
    "Kolporter": "from-pink-950 via-zinc-900/20 to-zinc-900",
    "Stokrotka": "from-green-950 via-gray-400/20 to-zinc-900",
    "DELIKATESY CENTRUM": "from-red-950 via-green-400/20 to-zinc-900",
    "Traditional Trade": "from-indigo-900/40 via-zinc-900/20 to-zinc-900",

  };

  return map[shopName] ?? "from-zinc-900 to-zinc-800";
}
