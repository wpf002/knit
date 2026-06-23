"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getCircleFeed,
  getDiscoverFeed,
  saveItem,
  unsaveItem,
  type FeedItem,
} from "../../lib/api";
import { ItemCard } from "../components/ItemCard";
import { IdentityBar } from "../components/IdentityBar";

// Phase 2: the two feeds, side by side. Circle (friend layer) carries
// retention; Discover (creator layer) carries acquisition. Browse and save —
// no transactions yet.
export default function FeedPage() {
  const [circle, setCircle] = useState<FeedItem[] | null>(null);
  const [discover, setDiscover] = useState<FeedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCircleFeed(), getDiscoverFeed()])
      .then(([c, d]) => {
        setCircle(c);
        setDiscover(d);
      })
      .catch((e) => {
        setError(String(e));
        setCircle([]); // stop the perpetual "Loading…" on failure
        setDiscover([]);
      });
  }, []);

  // Optimistic save toggle across whichever feed holds the item.
  const toggleSave = useCallback((id: string, currentlySaved: boolean) => {
    const flip = (list: FeedItem[] | null) =>
      list?.map((it) => (it.id === id ? { ...it, saved: !currentlySaved } : it)) ?? null;
    setCircle(flip);
    setDiscover(flip);
    const call = currentlySaved ? unsaveItem(id) : saveItem(id);
    call.catch(() => {
      // revert on failure
      const revert = (list: FeedItem[] | null) =>
        list?.map((it) => (it.id === id ? { ...it, saved: currentlySaved } : it)) ?? null;
      setCircle(revert);
      setDiscover(revert);
    });
  }, []);

  return (
    <main style={{ maxWidth: "var(--max)", margin: "0 auto", padding: "1.25rem 1.25rem 4rem" }}>
      <IdentityBar />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.6rem", margin: 0 }}>
          Feed
        </h1>
        <Link href="/saved" className="hint" style={{ textDecoration: "none" }}>
          ♥ Saved
        </Link>
      </div>

      {error ? (
        <p className="hint" style={{ color: "var(--raspberry)", marginTop: "1rem" }}>
          Couldn&apos;t load your feed: {error}. Is the API running?
        </p>
      ) : null}

      <FeedSection
        title="New in your circle"
        subtitle="What your friends are sharing — borrow it free."
        accent="var(--sage)"
        items={circle}
        emptyMsg="Nothing from your circle yet. Add friends, or post to your own closet."
        onToggleSave={toggleSave}
        borrowable
      />

      <FeedSection
        title="Discover"
        subtitle="Creators you follow, plus what's public. Rent or buy the real piece."
        accent="var(--raspberry)"
        items={discover}
        emptyMsg="Nothing to discover yet. Follow a creator to fill this up."
        onToggleSave={toggleSave}
        rentable
      />
    </main>
  );
}

function FeedSection({
  title,
  subtitle,
  accent,
  items,
  emptyMsg,
  onToggleSave,
  borrowable,
  rentable,
}: {
  title: string;
  subtitle: string;
  accent: string;
  items: FeedItem[] | null;
  emptyMsg: string;
  onToggleSave: (id: string, saved: boolean) => void;
  borrowable?: boolean;
  rentable?: boolean;
}) {
  return (
    <section style={{ marginTop: "1.75rem" }}>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 500,
          fontSize: "1.15rem",
          margin: 0,
          borderLeft: `3px solid ${accent}`,
          paddingLeft: "0.6rem",
        }}
      >
        {title}
      </h2>
      <p className="hint" style={{ margin: "0.2rem 0 0.85rem 0.6rem" }}>
        {subtitle}
      </p>
      {items === null ? (
        <p className="hint">Loading…</p>
      ) : items.length === 0 ? (
        <p className="hint">{emptyMsg}</p>
      ) : (
        <div className="card-grid">
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              owner={item.owner}
              saved={item.saved}
              onToggleSave={() => onToggleSave(item.id, item.saved)}
              borrowHref={borrowable && item.rentable ? `/borrow/${item.id}` : undefined}
              rentHref={rentable && item.rentable && item.rentDailyCents ? `/rent/${item.id}` : undefined}
              buyHref={item.buyable && item.buyCents ? `/acquire/${item.id}?kind=BUY` : undefined}
              giveHref={item.giveable ? `/acquire/${item.id}?kind=GIVEAWAY` : undefined}
            />
          ))}
        </div>
      )}
    </section>
  );
}
