"use client";

import { useCallback, useEffect, useState } from "react";
import { connectOnboard, getWallet, type WalletInfo } from "../../lib/api";
import { IdentityBar } from "../components/IdentityBar";
import { cents } from "../../lib/format";

// Phase 4: the circular wallet + creator payout setup. Lending earnings land
// here and can fund your own renting; Stripe Connect onboarding lets creators
// cash out.
export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    getWallet()
      .then(setWallet)
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(load, [load]);

  async function setupPayouts() {
    setBusy(true);
    try {
      const { url } = await connectOnboard();
      // Simulated provider returns straight back to /wallet?connect=done.
      window.location.href = url;
    } catch (e) {
      setError(String(e));
      setBusy(false);
    }
  }

  return (
    <main style={{ maxWidth: "var(--max)", margin: "0 auto", padding: "1.25rem 1.25rem 4rem" }}>
      <IdentityBar />
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.6rem", margin: "0 0 1rem" }}>
        Wallet
      </h1>

      {error ? <p className="hint" style={{ color: "var(--raspberry)" }}>{error}</p> : null}

      {wallet === null ? (
        <p className="hint">Loading…</p>
      ) : (
        <>
          <div
            style={{
              border: "1px solid var(--line)",
              borderLeft: "3px solid var(--sage)",
              borderRadius: "0.6rem",
              padding: "1.1rem",
              background: "#fff",
              marginBottom: "1.25rem",
            }}
          >
            <div className="hint" style={{ marginBottom: "0.2rem" }}>Circular balance</div>
            <div style={{ fontFamily: "var(--font-display)", fontSize: "2rem", fontWeight: 500 }}>
              {cents(wallet.walletCents)}
            </div>
            <p className="hint" style={{ margin: "0.4rem 0 0" }}>
              Earnings from lending land here — spend them renting from anyone on Knit.
            </p>
          </div>

          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.1rem", margin: "0 0 0.5rem" }}>
            Payouts
          </h2>
          {wallet.payoutsConnected ? (
            <p className="hint">✓ Payouts connected — you can cash out earnings to your bank.</p>
          ) : (
            <>
              <p className="hint" style={{ marginTop: 0 }}>
                Connect a payout account to cash out your creator-layer earnings.
              </p>
              <button className="btn btn-primary" disabled={busy} onClick={setupPayouts}>
                {busy ? "Opening…" : "Set up payouts"}
              </button>
            </>
          )}
        </>
      )}
    </main>
  );
}
