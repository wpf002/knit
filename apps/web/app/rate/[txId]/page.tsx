"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { rateTransaction } from "../../../lib/api";

// Phase 6: two-sided rating after a completed transaction. Care + timeliness
// feed the trust signals; the overall star rating shows on profiles.
function Stars({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div style={{ display: "flex", gap: "0.25rem" }}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          onClick={() => onChange(n)}
          style={{
            border: "none",
            background: "none",
            cursor: "pointer",
            fontSize: "1.6rem",
            lineHeight: 1,
            color: n <= value ? "var(--raspberry)" : "var(--line)",
          }}
        >
          ★
        </button>
      ))}
    </div>
  );
}

export default function RatePage() {
  const router = useRouter();
  const params = useParams<{ txId: string }>();
  const txId = params.txId;

  const [stars, setStars] = useState(5);
  const [care, setCare] = useState(5);
  const [timeliness, setTimeliness] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await rateTransaction(txId, { stars, care, timeliness, comment: comment.trim() || undefined });
      router.push("/borrows");
    } catch (err) {
      setError(String(err));
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: "var(--max)", margin: "0 auto", padding: "1.25rem 1.25rem 4rem" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem", margin: "0 0 1.25rem" }}>
        Leave a rating
      </h1>

      <form onSubmit={submit}>
        <div className="field">
          <label>Overall</label>
          <Stars value={stars} onChange={setStars} />
        </div>
        <div className="field">
          <label>Care — what condition was it in?</label>
          <Stars value={care} onChange={setCare} />
        </div>
        <div className="field">
          <label>Timeliness — on time for the handoff/return?</label>
          <Stars value={timeliness} onChange={setTimeliness} />
        </div>
        <div className="field">
          <label htmlFor="comment">Comment (optional)</label>
          <textarea id="comment" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
        </div>

        {error ? <p className="hint" style={{ color: "var(--raspberry)" }}>{error}</p> : null}

        <button type="submit" className="btn btn-primary" disabled={submitting} style={{ width: "100%" }}>
          {submitting ? "Submitting…" : "Submit rating"}
        </button>
      </form>
    </main>
  );
}
