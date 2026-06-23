"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { getItem, requestTransaction, type ItemWithOwner } from "../../../lib/api";
import { cents } from "../../../lib/format";

const DAY_MS = 86_400_000;

// Phase 4: the paid rental request (creator layer). Shows the price + deposit
// up front; the actual charge happens at checkout once the owner accepts.
export default function RentPage() {
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

  const days = useMemo(() => {
    if (!start || !end || end <= start) return 0;
    return Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / DAY_MS));
  }, [start, end]);

  const daily = item?.rentDailyCents ?? 0;
  const deposit = item?.depositCents ?? 0;
  const rent = daily * days;
  const total = rent + deposit;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (days < 1) {
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
        Rent this piece
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
              <div className="hint">from @{item.owner.handle}{item.owner.isCreator ? " · creator" : ""}</div>
              {item.owner.heightCm || item.owner.usualSize ? (
                <div className="hint" style={{ color: "var(--sage)" }}>
                  Owner is {item.owner.heightCm ? `${item.owner.heightCm}cm` : ""}
                  {item.owner.heightCm && item.owner.usualSize ? ", " : ""}
                  {item.owner.usualSize ? `usually ${item.owner.usualSize}` : ""}
                </div>
              ) : null}
              <div className="offer rent" style={{ display: "inline-block", marginTop: "0.4rem" }}>
                {cents(daily)}/day
              </div>
            </div>
          </div>

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

            <div
              style={{
                border: "1px solid var(--line)",
                borderRadius: "0.6rem",
                padding: "0.85rem",
                background: "#fff",
                marginBottom: "1rem",
              }}
            >
              <Row label={`Rent · ${days || 0} day${days === 1 ? "" : "s"}`} value={cents(rent)} />
              <Row label="Refundable deposit" value={cents(deposit)} muted />
              <div style={{ borderTop: "1px solid var(--line)", margin: "0.5rem 0" }} />
              <Row label="Due at checkout" value={cents(total)} bold />
              <p className="hint" style={{ margin: "0.5rem 0 0" }}>
                The deposit is held and refunded on a clean return. You pay once {item.owner.displayName} accepts.
              </p>
            </div>

            {error ? <p className="hint" style={{ color: "var(--raspberry)" }}>{error}</p> : null}

            <button type="submit" className="btn btn-primary" disabled={days < 1 || submitting} style={{ width: "100%" }}>
              {submitting ? "Sending…" : "Request to rent"}
            </button>
          </form>
        </>
      ) : error ? (
        <p className="hint" style={{ color: "var(--raspberry)" }}>{error}</p>
      ) : (
        <p className="hint">Loading…</p>
      )}
    </main>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "0.15rem 0" }}>
      <span style={{ color: muted ? "var(--muted)" : "var(--ink)", fontWeight: bold ? 600 : 400 }}>{label}</span>
      <span style={{ fontWeight: bold ? 600 : 400 }}>{value}</span>
    </div>
  );
}
