"use client";

import Link from "next/link";
import type { ClosetItem, FeedOwner } from "../../lib/api";
import { cents } from "../../lib/format";

// Photo-forward card (the pattern every competitor shares): image does the
// work, minimal chrome, availability is a first-class state, offer chips read
// the full rent/buy/give triad at a glance. In feeds it also attributes the
// owner (whose closet) and exposes a save (the like signal we convert later).
export function ItemCard({
  item,
  owner,
  saved,
  onToggleSave,
  borrowHref,
  rentHref,
  buyHref,
  giveHref,
}: {
  item: ClosetItem;
  owner?: FeedOwner;
  saved?: boolean;
  onToggleSave?: () => void;
  borrowHref?: string;
  rentHref?: string;
  buyHref?: string;
  giveHref?: string;
}) {
  const photo = item.photos[0];
  const available = item.status === "AVAILABLE";

  return (
    <article className="item-card">
      <div className="item-photo" style={photo ? { backgroundImage: `url(${photo})` } : undefined}>
        <span className={`avail${available ? "" : " out"}`}>
          {available ? "Available" : item.status.toLowerCase()}
        </span>
        {onToggleSave ? (
          <button
            type="button"
            className={`save${saved ? " on" : ""}`}
            aria-label={saved ? "Remove from saved" : "Save"}
            aria-pressed={saved}
            onClick={onToggleSave}
          >
            {saved ? "♥" : "♡"}
          </button>
        ) : null}
      </div>
      <div className="item-body">
        {owner ? (
          <span className="item-owner">
            from @{owner.handle}
            {owner.isCreator ? " · creator" : ""}
          </span>
        ) : item.brand ? (
          <span className="item-brand">{item.brand}</span>
        ) : null}
        <span className="item-title">{item.title}</span>
        <div className="item-offers">
          {item.rentable &&
            (item.rentDailyCents ? (
              <span className="offer rent">Rent {cents(item.rentDailyCents)}/day</span>
            ) : (
              <span className="offer free">Borrow free</span>
            ))}
          {item.buyable && item.buyCents ? (
            <span className="offer buy">Buy {cents(item.buyCents)}</span>
          ) : null}
          {item.giveable ? <span className="offer free">Give away</span> : null}
        </div>
        {item.status === "AVAILABLE" && (borrowHref || rentHref || buyHref || giveHref) ? (
          <div style={{ display: "grid", gap: "0.35rem", marginTop: "0.55rem" }}>
            {borrowHref ? (
              <Link href={borrowHref} className="btn btn-primary" style={{ padding: "0.45rem", fontSize: "0.85rem" }}>
                Request to borrow
              </Link>
            ) : null}
            {rentHref ? (
              <Link href={rentHref} className="btn btn-primary" style={{ padding: "0.45rem", fontSize: "0.85rem" }}>
                Rent {cents(item.rentDailyCents)}/day
              </Link>
            ) : null}
            {buyHref ? (
              <Link href={buyHref} className="btn" style={{ padding: "0.45rem", fontSize: "0.85rem" }}>
                Buy {cents(item.buyCents)}
              </Link>
            ) : null}
            {giveHref ? (
              <Link href={giveHref} className="btn" style={{ padding: "0.45rem", fontSize: "0.85rem" }}>
                Request — free
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}
