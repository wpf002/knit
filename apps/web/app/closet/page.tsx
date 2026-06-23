"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCloset, getMe, updateProfile, type ClosetItem, type Profile } from "../../lib/api";
import { ItemCard } from "../components/ItemCard";
import { IdentityBar } from "../components/IdentityBar";

// Phase 1: closet = profile. Your own closet, every status, with the entry
// point to post a new piece. Phase 6 adds trust (rating), rewards (points), and
// a fit profile (the "size twins" inputs).
export default function ClosetPage() {
  const [me, setMe] = useState<Profile | null>(null);
  const [items, setItems] = useState<ClosetItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingFit, setEditingFit] = useState(false);
  const [height, setHeight] = useState("");
  const [usualSize, setUsualSize] = useState("");

  useEffect(() => {
    Promise.all([getMe(), getCloset()])
      .then(([u, list]) => {
        setMe(u);
        setHeight(u.heightCm ? String(u.heightCm) : "");
        setUsualSize(u.usualSize ?? "");
        setItems(list);
      })
      .catch((e) => setError(String(e)));
  }, []);

  async function saveFit() {
    const h = parseInt(height, 10);
    const updated = await updateProfile({
      heightCm: Number.isFinite(h) && h > 0 ? h : null,
      usualSize: usualSize.trim() || null,
    });
    setMe(updated);
    setEditingFit(false);
  }

  return (
    <main style={{ maxWidth: "var(--max)", margin: "0 auto", padding: "1.25rem 1.25rem 4rem" }}>
      <IdentityBar />

      {me ? (
        <header style={{ marginBottom: "1.5rem" }}>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 500,
              fontSize: "1.9rem",
              margin: 0,
            }}
          >
            {me.displayName}
          </h1>
          <p className="hint" style={{ margin: "0.2rem 0 0" }}>
            @{me.handle}
            {me.isCreator ? " · creator" : ""}
          </p>
          {me.bio ? <p style={{ margin: "0.6rem 0 0" }}>{me.bio}</p> : null}

          <div style={{ display: "flex", gap: "1.1rem", margin: "0.7rem 0 0", fontSize: "0.85rem" }}>
            <span>
              {me.ratingAvg != null ? (
                <>
                  <strong>★ {me.ratingAvg.toFixed(1)}</strong>{" "}
                  <span className="hint">({me.ratingCount})</span>
                </>
              ) : (
                <span className="hint">No ratings yet</span>
              )}
            </span>
            <span>
              <strong>{me.points}</strong> <span className="hint">points</span>
            </span>
          </div>

          {/* Fit profile — the size-twins inputs */}
          <div style={{ marginTop: "0.6rem" }}>
            {editingFit ? (
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                <input
                  inputMode="numeric"
                  placeholder="Height (cm)"
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  style={{ width: 110, font: "inherit", padding: "0.4rem", border: "1px solid var(--line)", borderRadius: "0.4rem" }}
                />
                <input
                  placeholder="Usual size"
                  value={usualSize}
                  onChange={(e) => setUsualSize(e.target.value)}
                  style={{ width: 110, font: "inherit", padding: "0.4rem", border: "1px solid var(--line)", borderRadius: "0.4rem" }}
                />
                <button className="btn btn-primary" style={{ padding: "0.4rem 0.8rem" }} onClick={saveFit}>
                  Save
                </button>
              </div>
            ) : (
              <button
                className="hint"
                onClick={() => setEditingFit(true)}
                style={{ border: "none", background: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
              >
                {me.heightCm || me.usualSize
                  ? `Fit: ${me.heightCm ? `${me.heightCm}cm` : ""}${me.heightCm && me.usualSize ? " · " : ""}${me.usualSize ? `usually ${me.usualSize}` : ""} — edit`
                  : "Add your fit (height + usual size)"}
              </button>
            )}
          </div>
        </header>
      ) : null}

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "0.85rem",
        }}
      >
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.1rem", margin: 0 }}>
          Closet
        </h2>
        <Link href="/closet/new" className="btn btn-primary" style={{ padding: "0.5rem 0.9rem" }}>
          + Add a piece
        </Link>
      </div>

      {error ? (
        <p className="hint" style={{ color: "var(--raspberry)" }}>
          Couldn&apos;t load your closet: {error}. Is the API running on{" "}
          <code>{process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000"}</code>?
        </p>
      ) : items === null ? (
        <p className="hint">Loading…</p>
      ) : items.length === 0 ? (
        <div
          style={{
            border: "1px dashed var(--line)",
            borderRadius: "0.7rem",
            padding: "2rem 1.25rem",
            textAlign: "center",
          }}
        >
          <p style={{ margin: "0 0 1rem" }}>Your closet is empty. Post your first piece.</p>
          <Link href="/closet/new" className="btn btn-primary">
            + Add a piece
          </Link>
        </div>
      ) : (
        <div className="card-grid">
          {items.map((item) => (
            <ItemCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </main>
  );
}
