"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  getIncoming,
  getOutgoing,
  transitionTx,
  reportDamage,
  type Transaction,
  type TxStatus,
} from "../../lib/api";
import { IdentityBar } from "../components/IdentityBar";
import type { TxAction } from "@knit/shared";

const STATUS_LABEL: Record<TxStatus, string> = {
  REQUESTED: "Requested",
  ACCEPTED: "Accepted",
  DECLINED: "Declined",
  ACTIVE: "Out on loan",
  RETURNED: "Returned",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  DISPUTED: "Disputed",
};

// Which actions each side can take, given the kind + status. Mirrors the
// server's state machine — the server is still the source of truth. RENT loans
// out and back (pickup → return); BUY/GIVEAWAY transfer once (handoff).
function actionsFor(role: "lending" | "borrowing", tx: Transaction) {
  const a: { action: TxAction; label: string; primary?: boolean }[] = [];
  const isRent = tx.kind === "RENT";
  if (role === "lending") {
    if (tx.status === "REQUESTED") {
      a.push({ action: "accept", label: "Accept", primary: true }, { action: "decline", label: "Decline" });
    } else if (tx.status === "ACCEPTED") {
      if (isRent) a.push({ action: "pickup", label: "Mark picked up", primary: true });
      else a.push({ action: "handoff", label: "Mark handed off", primary: true });
      a.push({ action: "cancel", label: "Cancel" });
    } else if (tx.status === "ACTIVE") {
      a.push({ action: "return", label: "Mark returned", primary: true });
    }
  } else {
    if (tx.status === "REQUESTED" || tx.status === "ACCEPTED") {
      a.push({ action: "cancel", label: "Cancel request" });
    }
  }
  return a;
}

export default function BorrowsPage() {
  const [incoming, setIncoming] = useState<Transaction[] | null>(null);
  const [outgoing, setOutgoing] = useState<Transaction[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    Promise.all([getIncoming(), getOutgoing()])
      .then(([i, o]) => {
        setIncoming(i);
        setOutgoing(o);
      })
      .catch((e) => setError(String(e)));
  }, []);

  useEffect(load, [load]);

  async function act(id: string, action: TxAction) {
    setBusy(`${id}:${action}`);
    try {
      await transitionTx(id, action);
      load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  // Damage claim: prompt for an amount (dollars) to capture from the deposit.
  async function damage(tx: Transaction) {
    const input = window.prompt(
      `Report damage on "${tx.item.title}". Amount to capture from the deposit (max ${(tx.depositCents / 100).toFixed(2)}):`,
    );
    if (input == null) return;
    const amountCents = Math.round(parseFloat(input) * 100);
    if (!Number.isFinite(amountCents) || amountCents <= 0) {
      setError("Enter a valid damage amount.");
      return;
    }
    setBusy(`${tx.id}:damage`);
    try {
      await reportDamage(tx.id, amountCents);
      load();
    } catch (e) {
      setError(String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <main style={{ maxWidth: "var(--max)", margin: "0 auto", padding: "1.25rem 1.25rem 4rem" }}>
      <IdentityBar />
      <h1 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.6rem", margin: "0 0 1rem" }}>
        Borrows
      </h1>

      {error ? (
        <p className="hint" style={{ color: "var(--raspberry)" }}>{error}</p>
      ) : null}

      <Section
        title="Lending"
        subtitle="Requests on your closet."
        accent="var(--sage)"
        items={incoming}
        role="lending"
        busy={busy}
        onAct={act}
        onDamage={damage}
        empty="No one's asked to borrow from you yet."
      />
      <Section
        title="Borrowing"
        subtitle="What you've asked to borrow."
        accent="var(--raspberry)"
        items={outgoing}
        role="borrowing"
        busy={busy}
        onAct={act}
        onDamage={damage}
        empty={
          <>
            You haven&apos;t requested anything. Find something in your <Link href="/feed">feed</Link>.
          </>
        }
      />
    </main>
  );
}

function Section({
  title,
  subtitle,
  accent,
  items,
  role,
  busy,
  onAct,
  onDamage,
  empty,
}: {
  title: string;
  subtitle: string;
  accent: string;
  items: Transaction[] | null;
  role: "lending" | "borrowing";
  busy: string | null;
  onAct: (id: string, action: TxAction) => void;
  onDamage: (tx: Transaction) => void;
  empty: React.ReactNode;
}) {
  return (
    <section style={{ marginTop: "1.5rem" }}>
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
      <p className="hint" style={{ margin: "0.2rem 0 0.85rem 0.6rem" }}>{subtitle}</p>

      {items === null ? (
        <p className="hint">Loading…</p>
      ) : items.length === 0 ? (
        <p className="hint">{empty}</p>
      ) : (
        <div style={{ display: "grid", gap: "0.6rem" }}>
          {items.map((tx) => {
            const other = role === "lending" ? tx.counterparty : tx.owner;
            const actions = actionsFor(role, tx);
            return (
              <div
                key={tx.id}
                style={{
                  display: "flex",
                  gap: "0.7rem",
                  alignItems: "center",
                  border: "1px solid var(--line)",
                  borderRadius: "0.6rem",
                  padding: "0.6rem",
                  background: "#fff",
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 60,
                    borderRadius: "0.4rem",
                    flexShrink: 0,
                    background: `var(--line) center/cover no-repeat${tx.item.photos[0] ? ` url(${tx.item.photos[0]})` : ""}`,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: "0.95rem" }}>{tx.item.title}</div>
                  <div className="hint">
                    {role === "lending" ? "to" : "from"} @{other.handle} · {STATUS_LABEL[tx.status]}
                  </div>
                  {(() => {
                    const needsPay =
                      role === "borrowing" &&
                      tx.status === "ACCEPTED" &&
                      tx.paymentStatus === "REQUIRES_PAYMENT";
                    const canDamage =
                      role === "lending" && tx.status === "ACTIVE" && tx.layer === "CREATOR" && tx.depositCents > 0;
                    const canRate = tx.status === "COMPLETED";
                    if (actions.length === 0 && !needsPay && !canDamage && !canRate) return null;
                    return (
                      <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
                        {needsPay ? (
                          <Link
                            href={`/checkout/${tx.id}`}
                            className="btn btn-primary"
                            style={{ padding: "0.35rem 0.7rem", fontSize: "0.82rem" }}
                          >
                            Pay now
                          </Link>
                        ) : null}
                        {actions.map((a) => (
                          <button
                            key={a.action}
                            className={`btn${a.primary ? " btn-primary" : ""}`}
                            style={{ padding: "0.35rem 0.7rem", fontSize: "0.82rem" }}
                            disabled={busy === `${tx.id}:${a.action}`}
                            onClick={() => onAct(tx.id, a.action)}
                          >
                            {a.label}
                          </button>
                        ))}
                        {canDamage ? (
                          <button
                            className="btn"
                            style={{ padding: "0.35rem 0.7rem", fontSize: "0.82rem" }}
                            disabled={busy === `${tx.id}:damage`}
                            onClick={() => onDamage(tx)}
                          >
                            Report damage
                          </button>
                        ) : null}
                        {canRate ? (
                          <Link
                            href={`/rate/${tx.id}`}
                            className="btn"
                            style={{ padding: "0.35rem 0.7rem", fontSize: "0.82rem" }}
                          >
                            Rate @{other.handle}
                          </Link>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
