"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getItem, requestTransaction, type ItemWithOwner } from "../../../lib/api";

// Phase 3: the free borrow request (friend layer). Pick the window you need;
// the owner accepts, then you arrange a local handoff — no money, no shipping.
export default function BorrowPage() {
  const router = useRouter();
  const params = useParams<{ itemId: string }>();
  const itemId = params.itemId;

  const [item, setItem] = useState<ItemWithOwner | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getItem(itemId)
      .then(setItem)
      .catch((e) => setError(String(e)));
  }, [itemId]);

  const valid = useMemo(() => start !== "" && end !== "" && end > start, [start, end]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!valid) {
      setError("Pick a start and end date (end after start).");
      return;
    }
    setSubmitting(true);
    try {
      await requestTransaction({
        itemId,
        kind: "RENT",
        startDate: new Date(start),
        endDate: new Date(end),
      });
      router.push("/borrows");
    } catch (err) {
      setError(String(err));
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: "var(--max)", margin: "0 auto", padding: "1.25rem 1.25rem 4rem" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem", margin: "0 0 1rem" }}>
        Request to borrow
      </h1>

      {item ? (
        <div style={{ display: "flex", gap: "0.85rem", alignItems: "center", marginBottom: "1.5rem" }}>
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
            {item.owner.heightCm || item.owner.usualSize ? (
              <div className="hint" style={{ color: "var(--sage)" }}>
                Owner is {item.owner.heightCm ? `${item.owner.heightCm}cm` : ""}
                {item.owner.heightCm && item.owner.usualSize ? ", " : ""}
                {item.owner.usualSize ? `usually ${item.owner.usualSize}` : ""}
              </div>
            ) : null}
            <div className="offer free" style={{ display: "inline-block", marginTop: "0.4rem" }}>
              Free among friends
            </div>
          </div>
        </div>
      ) : error ? (
        <p className="hint" style={{ color: "var(--raspberry)" }}>{error}</p>
      ) : (
        <p className="hint">Loading…</p>
      )}

      {item ? (
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="field">
              <label htmlFor="start">From</label>
              <input id="start" type="date" value={start} onChange={(e) => setStart(e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="end">Until</label>
              <input id="end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} required />
            </div>
          </div>
          <p className="hint" style={{ marginTop: 0 }}>
            Once {item.owner.displayName} accepts, you&apos;ll arrange a local handoff — no shipping, no fees.
          </p>

          {error ? (
            <p className="hint" style={{ color: "var(--raspberry)" }}>{error}</p>
          ) : null}

          <button type="submit" className="btn btn-primary" disabled={!valid || submitting} style={{ width: "100%", marginTop: "0.5rem" }}>
            {submitting ? "Sending…" : "Send request"}
          </button>
        </form>
      ) : null}
    </main>
  );
}
