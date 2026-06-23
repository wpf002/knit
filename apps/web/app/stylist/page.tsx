"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getStylist,
  getSubscription,
  type StylistPick,
  type Subscription,
} from "../../lib/api";
import { ItemCard } from "../components/ItemCard";
import { IdentityBar } from "../components/IdentityBar";

// Phase 7: the AI stylist (Plus). Styles you for an occasion from your network's
// real closets — friends' and creators', not a catalog.
export default function StylistPage() {
  const [sub, setSub] = useState<Subscription | null>(null);
  const [occasion, setOccasion] = useState("");
  const [picks, setPicks] = useState<StylistPick[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSubscription().then(setSub).catch(() => setSub(null));
  }, []);

  const isPlus = sub?.tier === "PLUS" && sub?.status === "ACTIVE";

  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (!occasion.trim()) return;
    setLoading(true);
    setError(null);
    setPicks(null);
    try {
      setPicks(await getStylist(occasion.trim()));
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ maxWidth: "var(--max)", margin: "0 auto", padding: "1.25rem 1.25rem 4rem" }}>
      <IdentityBar />
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.6rem", margin: "0 0 0.4rem" }}>
        Stylist
      </h1>
      <p className="hint" style={{ marginTop: 0 }}>
        Tell me the occasion — I&apos;ll pull looks from your friends&apos; and creators&apos; closets.
      </p>

      {sub && !isPlus ? (
        <div
          style={{
            border: "1px solid var(--line)",
            borderLeft: "3px solid var(--raspberry)",
            borderRadius: "0.6rem",
            padding: "1rem",
            background: "#fff",
            marginTop: "1rem",
          }}
        >
          <p style={{ margin: "0 0 0.6rem" }}>The stylist is part of Knit Plus.</p>
          <Link href="/plus" className="btn btn-primary">
            See Knit Plus
          </Link>
        </div>
      ) : (
        <form onSubmit={ask} style={{ display: "flex", gap: "0.5rem", margin: "1rem 0" }}>
          <input
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            placeholder="a summer wedding"
            style={{ flex: 1, font: "inherit", padding: "0.65rem 0.75rem", border: "1px solid var(--line)", borderRadius: "0.55rem" }}
          />
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Thinking…" : "Style me"}
          </button>
        </form>
      )}

      {error ? <p className="hint" style={{ color: "var(--raspberry)" }}>{error}</p> : null}

      {picks ? (
        picks.length === 0 ? (
          <p className="hint">Nothing in your network fits that yet — follow a few more closets.</p>
        ) : (
          <div style={{ display: "grid", gap: "0.85rem" }}>
            {picks.map((p) => (
              <div key={p.id}>
                <p className="hint" style={{ margin: "0 0 0.4rem" }}>{p.reason}</p>
                <ItemCard
                  item={p}
                  owner={p.owner}
                  rentHref={p.rentable && p.rentDailyCents ? `/rent/${p.id}` : undefined}
                  borrowHref={p.rentable && !p.rentDailyCents ? `/borrow/${p.id}` : undefined}
                  buyHref={p.buyable && p.buyCents ? `/acquire/${p.id}?kind=BUY` : undefined}
                />
              </div>
            ))}
          </div>
        )
      ) : null}
    </main>
  );
}
