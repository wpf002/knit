// The AI stylist's brain. Today it's a deterministic recommender over the
// user's *real network inventory* — the thing that makes Knit's assistant
// different from a catalog recommender (it styles you from people you know).
//
// TODO(live): when env.ANTHROPIC_API_KEY is set, send this same candidate list
// to Claude (e.g. claude-sonnet-4-6 for cost) with the occasion and let it pick
// + write the reasons. The candidate set and the response shape stay identical,
// so the route doesn't change.

export interface StylableItem {
  id: string;
  title: string;
  brand?: string | null;
  category?: string | null;
  color?: string | null;
  rentable: boolean;
  rentDailyCents?: number | null;
  buyable: boolean;
  giveable: boolean;
  ownerHandle: string;
  layer: "FRIEND" | "CREATOR";
}

export interface Recommendation {
  id: string;
  reason: string;
}

// Occasion → garment categories that tend to suit it.
const OCCASION_HINTS: Array<[RegExp, string[]]> = [
  [/wedding|black.?tie|formal|gala|cocktail/, ["dress", "gown", "skirt"]],
  [/work|office|interview|meeting/, ["blazer", "trouser", "shirt", "outerwear"]],
  [/party|going.?out|night|club|birthday|date/, ["dress", "skirt", "top"]],
  [/vacation|holiday|beach|summer/, ["dress", "skirt", "linen"]],
  [/festival|concert/, ["denim", "jacket", "skirt", "outerwear"]],
];

function priceTag(it: StylableItem): string {
  if (it.layer === "FRIEND" && it.rentable) return "free to borrow";
  if (it.rentable && it.rentDailyCents) return `rent $${(it.rentDailyCents / 100).toFixed(0)}/day`;
  if (it.giveable) return "free";
  return "in your network";
}

export function recommend(occasion: string, items: StylableItem[], limit = 4): Recommendation[] {
  const q = occasion.toLowerCase();
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  const cats = OCCASION_HINTS.find(([re]) => re.test(q))?.[1] ?? [];

  const scored = items
    .map((it) => {
      const hay = `${it.title} ${it.category ?? ""} ${it.brand ?? ""} ${it.color ?? ""}`.toLowerCase();
      let score = 0;
      if (cats.some((c) => (it.category ?? "").toLowerCase().includes(c) || hay.includes(c))) score += 3;
      if (words.some((w) => hay.includes(w))) score += 2;
      if (it.layer === "FRIEND") score += 1; // nudge toward free friend pieces
      return { it, score };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ it }) => ({
    id: it.id,
    reason: `${it.title}${it.brand ? ` by ${it.brand}` : ""} from @${it.ownerHandle} — ${priceTag(it)}, a fit for ${occasion}.`,
  }));
}
