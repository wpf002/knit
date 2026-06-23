"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getSaved, unsaveItem, type FeedItem } from "../../lib/api";
import { ItemCard } from "../components/ItemCard";
import { IdentityBar } from "../components/IdentityBar";

// Phase 2: the wishlist. Decoupled from any order — you hoard pieces from many
// closets here, then act on them later (Nuuly's "fill from your closet" idea).
export default function SavedPage() {
  const [items, setItems] = useState<FeedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSaved()
      .then(setItems)
      .catch((e) => setError(String(e)));
  }, []);

  function remove(id: string) {
    setItems((list) => list?.filter((it) => it.id !== id) ?? null);
    unsaveItem(id).catch(() => {
      // reload on failure so the UI reflects truth
      getSaved().then(setItems).catch(() => {});
    });
  }

  return (
    <main style={{ maxWidth: "var(--max)", margin: "0 auto", padding: "1.25rem 1.25rem 4rem" }}>
      <IdentityBar />
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.6rem", margin: "0 0 1rem" }}>
        Saved
      </h1>

      {error ? (
        <p className="hint" style={{ color: "var(--raspberry)" }}>
          Couldn&apos;t load saved items: {error}.
        </p>
      ) : items === null ? (
        <p className="hint">Loading…</p>
      ) : items.length === 0 ? (
        <p className="hint">
          Nothing saved yet. Tap the heart on anything in your <Link href="/feed">feed</Link>.
        </p>
      ) : (
        <div className="card-grid">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              owner={item.owner}
              saved={item.saved}
              onToggleSave={() => remove(item.id)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
