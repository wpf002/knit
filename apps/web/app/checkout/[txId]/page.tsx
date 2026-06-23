"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  checkout,
  confirmPayment,
  getTransaction,
  getWallet,
  type Transaction,
} from "../../../lib/api";
import { cents } from "../../../lib/format";

// Phase 4 checkout. Pay a held deposit + rent by card (simulated Stripe) or
// straight from the in-app wallet (the circular-credit edge feature).
export default function CheckoutPage() {
  const router = useRouter();
  const params = useParams<{ txId: string }>();
  const txId = params.txId;

  const [tx, setTx] = useState<Transaction | null>(null);
  const [walletCents, setWalletCents] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getTransaction(txId), getWallet()])
      .then(([t, w]) => {
        setTx(t);
        setWalletCents(w.walletCents);
      })
      .catch((e) => setError(String(e)));
  }, [txId]);

  const total = tx ? (tx.priceCents ?? 0) + tx.depositCents : 0;
  const canUseWallet = walletCents >= total && total > 0;

  async function payCard() {
    setBusy(true);
    setError(null);
    try {
      // Authorize (simulated Stripe), then confirm. In live mode confirmation
      // would come from Stripe.js + a webhook.
      await checkout(txId, false);
      await confirmPayment(txId);
      router.push("/borrows");
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  }

  async function payWallet() {
    setBusy(true);
    setError(null);
    try {
      await checkout(txId, true);
      router.push("/borrows");
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: "var(--max)", margin: "0 auto", padding: "1.25rem 1.25rem 4rem" }}>
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.5rem", margin: "0 0 1rem" }}>
        Checkout
      </h1>

      {error ? <p className="hint" style={{ color: "var(--raspberry)" }}>{error}</p> : null}

      {tx === null ? (
        <p className="hint">Loading…</p>
      ) : tx.paymentStatus !== "REQUIRES_PAYMENT" ? (
        <p className="hint">
          This rental is {tx.paymentStatus === "PAID" ? "already paid" : tx.paymentStatus.toLowerCase()}.
        </p>
      ) : (
        <>
          <div
            style={{
              border: "1px solid var(--line)",
              borderRadius: "0.6rem",
              padding: "0.85rem",
              background: "#fff",
              marginBottom: "1.25rem",
            }}
          >
            <div style={{ fontSize: "1.05rem", marginBottom: "0.5rem" }}>{tx.item.title}</div>
            <Row label="Rent" value={cents(tx.priceCents ?? 0)} />
            <Row label="Refundable deposit" value={cents(tx.depositCents)} muted />
            <div style={{ borderTop: "1px solid var(--line)", margin: "0.5rem 0" }} />
            <Row label="Total" value={cents(total)} bold />
          </div>

          <button className="btn btn-primary" disabled={busy} onClick={payCard} style={{ width: "100%", marginBottom: "0.6rem" }}>
            {busy ? "Processing…" : `Pay ${cents(total)} by card`}
          </button>
          <button className="btn" disabled={busy || !canUseWallet} onClick={payWallet} style={{ width: "100%" }}>
            Pay from wallet ({cents(walletCents)} available)
          </button>
          {!canUseWallet ? (
            <p className="hint" style={{ marginTop: "0.5rem" }}>
              Your wallet doesn&apos;t cover the total — earnings from lending land here and can pay for rentals.
            </p>
          ) : null}
        </>
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
