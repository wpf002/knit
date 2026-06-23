"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { CreateItemInput } from "@knit/shared";
import { createItem, getUid, type Visibility } from "../../../lib/api";
import { cents } from "../../../lib/format";

// Phase 1 keystone: posting a piece should feel like posting, not data entry.
// Photos-first (with a worn-on-body nudge), then the quick details, then how
// you want to share it. Pricing offers a suggestion so nobody faces a blank.
function dollarsToCents(v: string): number | null {
  const n = parseFloat(v);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

export default function NewItemPage() {
  const router = useRouter();

  const [photos, setPhotos] = useState<string[]>([]);
  const [photoDraft, setPhotoDraft] = useState("");
  const [title, setTitle] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [size, setSize] = useState("");
  const [fit, setFit] = useState("");
  const [color, setColor] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("CIRCLE");

  const [rentable, setRentable] = useState(true);
  const [buyable, setBuyable] = useState(false);
  const [giveable, setGiveable] = useState(false);
  const [rentDaily, setRentDaily] = useState("");
  const [deposit, setDeposit] = useState("");
  const [buy, setBuy] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Suggested daily rent: ~10–15% of buy price (the guidance Pickle/HURR give
  // lenders). Only shown once a buy price exists and the item is rentable.
  const suggestion = useMemo(() => {
    const b = dollarsToCents(buy);
    if (!b || !rentable) return null;
    return { low: Math.round(b * 0.1), high: Math.round(b * 0.15) };
  }, [buy, rentable]);

  function addPhoto() {
    const url = photoDraft.trim();
    if (!url) return;
    setPhotos((p) => (p.length < 8 ? [...p, url] : p));
    setPhotoDraft("");
  }

  const canSubmit = title.trim().length > 0 && (rentable || buyable || giveable) && !submitting;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!getUid()) {
      setError("Pick an identity first — head to your Closet and choose who you are.");
      return;
    }
    setSubmitting(true);
    const input: CreateItemInput = {
      title: title.trim(),
      brand: brand.trim() || undefined,
      category: category.trim() || undefined,
      size: size.trim() || undefined,
      fit: fit.trim() || undefined,
      color: color.trim() || undefined,
      photos,
      visibility,
      rentable,
      buyable,
      giveable,
      rentDailyCents: rentable ? dollarsToCents(rentDaily) : null,
      depositCents: rentable ? dollarsToCents(deposit) : null,
      buyCents: buyable ? dollarsToCents(buy) : null,
    };
    try {
      await createItem(input);
      router.push("/closet");
    } catch (err) {
      setError(String(err));
      setSubmitting(false);
    }
  }

  return (
    <main style={{ maxWidth: "var(--max)", margin: "0 auto", padding: "1.25rem 1.25rem 4rem" }}>
      <h1
        style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.6rem", margin: "0 0 1.25rem" }}
      >
        Add a piece
      </h1>

      <form onSubmit={submit}>
        {/* --- Photos first (Depop-style) --- */}
        <section style={{ marginBottom: "1.75rem" }}>
          <div className="field">
            <label htmlFor="photo">Photos</label>
            <p className="hint" style={{ margin: 0 }}>
              A shot of it actually worn — by you or a friend — gets the most interest. Add up to 8.
            </p>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.35rem" }}>
              <input
                id="photo"
                type="url"
                placeholder="Paste an image URL"
                value={photoDraft}
                onChange={(e) => setPhotoDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addPhoto();
                  }
                }}
                style={{ flex: 1 }}
              />
              <button type="button" className="btn" onClick={addPhoto} disabled={photos.length >= 8}>
                Add
              </button>
            </div>
          </div>
          {photos.length > 0 ? (
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {photos.map((url, i) => (
                <div
                  key={`${url}-${i}`}
                  style={{
                    width: 64,
                    height: 84,
                    borderRadius: "0.4rem",
                    background: `var(--line) center/cover no-repeat url(${url})`,
                    position: "relative",
                  }}
                >
                  <button
                    type="button"
                    aria-label="Remove photo"
                    onClick={() => setPhotos((p) => p.filter((_, j) => j !== i))}
                    style={{
                      position: "absolute",
                      top: -6,
                      right: -6,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      border: "none",
                      background: "var(--ink)",
                      color: "#fff",
                      cursor: "pointer",
                      lineHeight: 1,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {/* --- Details --- */}
        <section style={{ marginBottom: "1.75rem" }}>
          <div className="field">
            <label htmlFor="title">What is it?</label>
            <input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Black slip dress"
              required
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div className="field">
              <label htmlFor="brand">Brand</label>
              <input id="brand" value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Reformation" />
            </div>
            <div className="field">
              <label htmlFor="category">Category</label>
              <input id="category" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="dress" />
            </div>
            <div className="field">
              <label htmlFor="size">Size</label>
              <input id="size" value={size} onChange={(e) => setSize(e.target.value)} placeholder="S" />
            </div>
            <div className="field">
              <label htmlFor="fit">Fit</label>
              <input id="fit" value={fit} onChange={(e) => setFit(e.target.value)} placeholder="regular" />
            </div>
            <div className="field">
              <label htmlFor="color">Color</label>
              <input id="color" value={color} onChange={(e) => setColor(e.target.value)} placeholder="black" />
            </div>
          </div>
        </section>

        {/* --- How to share it --- */}
        <section style={{ marginBottom: "1.75rem" }}>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 500, fontSize: "1.05rem", margin: "0 0 0.75rem" }}>
            How do you want to share it?
          </h2>

          <label style={{ display: "flex", gap: "0.55rem", alignItems: "flex-start", marginBottom: "0.6rem" }}>
            <input type="checkbox" checked={rentable} onChange={(e) => setRentable(e.target.checked)} />
            <span>
              <strong>Lend / rent</strong>
              <span className="hint" style={{ display: "block" }}>
                Free for friends (your circle). Followers pay your daily rate.
              </span>
            </span>
          </label>
          {rentable ? (
            <div className="field" style={{ marginLeft: "1.7rem" }}>
              <label htmlFor="rentDaily">Daily rate for followers (leave blank = free)</label>
              <input
                id="rentDaily"
                inputMode="decimal"
                value={rentDaily}
                onChange={(e) => setRentDaily(e.target.value)}
                placeholder="15"
              />
              {suggestion ? (
                <p className="hint" style={{ margin: 0 }}>
                  Most lenders price ~10–15% of the buy price ({cents(suggestion.low)}–
                  {cents(suggestion.high)}/day).{" "}
                  <button
                    type="button"
                    onClick={() => setRentDaily(String(Math.round(((suggestion.low + suggestion.high) / 2 / 100) * 100) / 100))}
                    style={{
                      border: "none",
                      background: "none",
                      color: "var(--raspberry)",
                      cursor: "pointer",
                      font: "inherit",
                      textDecoration: "underline",
                      padding: 0,
                    }}
                  >
                    use {cents(Math.round((suggestion.low + suggestion.high) / 2))}
                  </button>
                </p>
              ) : null}
            </div>
          ) : null}
          {rentable ? (
            <div className="field" style={{ marginLeft: "1.7rem" }}>
              <label htmlFor="deposit">Security deposit (refunded on a clean return)</label>
              <input
                id="deposit"
                inputMode="decimal"
                value={deposit}
                onChange={(e) => setDeposit(e.target.value)}
                placeholder="50"
              />
              <p className="hint" style={{ margin: 0 }}>
                Held only on paid creator-layer rentals. Friends borrow free, no deposit.
              </p>
            </div>
          ) : null}

          <label style={{ display: "flex", gap: "0.55rem", alignItems: "flex-start", marginBottom: "0.6rem" }}>
            <input type="checkbox" checked={buyable} onChange={(e) => setBuyable(e.target.checked)} />
            <span>
              <strong>Sell</strong>
              <span className="hint" style={{ display: "block" }}>Let people buy it outright.</span>
            </span>
          </label>
          {buyable ? (
            <div className="field" style={{ marginLeft: "1.7rem" }}>
              <label htmlFor="buy">Buy price</label>
              <input id="buy" inputMode="decimal" value={buy} onChange={(e) => setBuy(e.target.value)} placeholder="90" />
            </div>
          ) : null}

          <label style={{ display: "flex", gap: "0.55rem", alignItems: "flex-start" }}>
            <input type="checkbox" checked={giveable} onChange={(e) => setGiveable(e.target.checked)} />
            <span>
              <strong>Give away</strong>
              <span className="hint" style={{ display: "block" }}>Free to a good home.</span>
            </span>
          </label>
        </section>

        {/* --- Visibility --- */}
        <div className="field">
          <label htmlFor="visibility">Who can see it?</label>
          <select id="visibility" value={visibility} onChange={(e) => setVisibility(e.target.value as Visibility)}>
            <option value="CIRCLE">Circle — friends only</option>
            <option value="FOLLOWER">Followers — your creator layer</option>
            <option value="PUBLIC">Public — anyone can discover it</option>
          </select>
        </div>

        {error ? (
          <p className="hint" style={{ color: "var(--raspberry)" }}>
            {error}
          </p>
        ) : null}

        <button type="submit" className="btn btn-primary" disabled={!canSubmit} style={{ width: "100%", marginTop: "0.5rem" }}>
          {submitting ? "Posting…" : "Post to my closet"}
        </button>
      </form>
    </main>
  );
}
