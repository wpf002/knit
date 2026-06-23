"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cancelPlus, getSubscription, subscribePlus, type Subscription } from "../../lib/api";
import { IdentityBar } from "../components/IdentityBar";

const PERKS = [
  "The AI stylist — looks pulled from your network's closets",
  "Early access to creator drops",
  "Priority on popular pieces",
  "Bonus reward points on every loan",
];

// Phase 7: the $10 Plus tier. Billing simulated (no real charge) — Stripe
// Billing slots in where subscribePlus() is wired.
export default function PlusPage() {
  const router = useRouter();
  const [sub, setSub] = useState<Subscription | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getSubscription().then(setSub).catch(() => setSub(null));
  }, []);

  const isPlus = sub?.tier === "PLUS" && sub?.status === "ACTIVE";

  const [error, setError] = useState<string | null>(null);

  async function subscribe() {
    setBusy(true);
    setError(null);
    try {
      setSub(await subscribePlus());
      router.push("/stylist");
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  }

  async function cancel() {
    setBusy(true);
    try {
      setSub(await cancelPlus());
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: "var(--max)", margin: "0 auto", padding: "1.25rem 1.25rem 4rem" }}>
      <IdentityBar />
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.9rem", margin: "0 0 0.3rem" }}>
        Knit Plus
      </h1>
      <p className="hint" style={{ marginTop: 0 }}>
        <strong style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", color: "var(--ink)" }}>$10</strong>/month — the
        social layer + your personal stylist. Renting is always free.
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: "1.25rem 0", display: "grid", gap: "0.6rem" }}>
        {PERKS.map((p) => (
          <li key={p} style={{ display: "flex", gap: "0.55rem", alignItems: "baseline" }}>
            <span style={{ color: "var(--raspberry)" }}>✓</span>
            <span>{p}</span>
          </li>
        ))}
      </ul>

      {isPlus ? (
        <>
          <p className="hint">
            ✓ You&apos;re on Plus
            {sub?.currentPeriodEnd ? ` · renews ${new Date(sub.currentPeriodEnd).toLocaleDateString()}` : ""}.
          </p>
          <button className="btn" disabled={busy} onClick={cancel}>
            Cancel Plus
          </button>
        </>
      ) : (
        <button className="btn btn-primary" disabled={busy} onClick={subscribe} style={{ width: "100%" }}>
          {busy ? "Activating…" : "Get Knit Plus — $10/mo"}
        </button>
      )}
      {error ? (
        <p className="hint" style={{ marginTop: "0.75rem", color: "var(--raspberry)" }}>{error}</p>
      ) : null}
      <p className="hint" style={{ marginTop: "0.75rem" }}>
        Billing is simulated in this build — no card is charged.
      </p>
    </main>
  );
}
