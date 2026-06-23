"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getItem, requestTransaction, type ItemWithOwner } from "../../../lib/api";
import { cents } from "../../../lib/format";

// Phase 5: buy or give-away request. Buy carries a price (paid at checkout once
// accepted); give-away is free. Neither needs a rental window.
export default function AcquirePage() {
  const router = useRouter();
  const params = useParams<{ itemId: string }>();
  const search = useSearchParams();
  const itemId = params.itemId;
  const kind = search.get("kind") === "GIVEAWAY" ? "GIVEAWAY" : "BUY";

  const [item, setItem] = useState<ItemWithOwner | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getItem(itemId)
      .then(setItem)
      .catch((e) => setError(String(e)));
  }, [itemId]);

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      await requestTransaction({ itemId, kind });
      router.push("/borrows");
    } catch (err) {
      setError(String(err));
      setSubmitting(false);
    }
  }

  const isBuy = kind === "BUY";

  return (
    <main style={{ maxWidth: "var(--max)", margin: "0 auto", padding: "1.25rem 1.25rem 4rem" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem", margin: "0 0 1rem" }}>
        {isBuy ? "Buy this piece" : "Request this piece"}
      </h1>

      {item ? (
        <>
          <div style={{ display: "flex", gap: "0.85rem", alignItems: "center", marginBottom: "1.25rem" }}>
            <div
              style={{
                width: 72,
                height: 96,
                borderRadius: "0.5rem",
                flexShrink: 0,
                background: `var(--line) center/cover no-repeat${item.photos[0] ? ` url(${item.photos[0]})` : ""}`,
              }}
            />
            <div>
              <div style={{ fontSize: "1.05rem" }}>{item.title}</div>
              <div className="hint">from @{item.owner.handle}</div>
              <div className={`offer ${isBuy ? "buy" : "free"}`} style={{ display: "inline-block", marginTop: "0.4rem" }}>
                {isBuy ? `Buy ${cents(item.buyCents)}` : "Free to a good home"}
              </div>
            </div>
          </div>

          <p className="hint">
            {isBuy
              ? `Once ${item.owner.displayName} accepts, you'll pay and arrange a local handoff.`
              : `Once ${item.owner.displayName} accepts, arrange a local handoff — it's yours, free.`}
          </p>

          {error ? <p className="hint" style={{ color: "var(--raspberry)" }}>{error}</p> : null}

          <button className="btn btn-primary" disabled={submitting} onClick={submit} style={{ width: "100%", marginTop: "0.5rem" }}>
            {submitting ? "Sending…" : isBuy ? "Request to buy" : "Request it"}
          </button>
        </>
      ) : error ? (
        <p className="hint" style={{ color: "var(--raspberry)" }}>{error}</p>
      ) : (
        <p className="hint">Loading…</p>
      )}
    </main>
  );
}
