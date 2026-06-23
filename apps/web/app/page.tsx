// Landing thesis. The hero states the one true thing about the product: you get
// into closets you can't see anywhere else — your friends', and the creators
// you follow. The two layers are the structural device, so they ARE the page.

const layers = [
  {
    tag: "Your circle",
    color: "var(--sage)",
    line: "What your friends actually own and wear. Borrow it free.",
  },
  {
    tag: "Your follows",
    color: "var(--raspberry)",
    line: "The creators you watch for outfits. Rent or buy the real piece.",
  },
];

export default function Home() {
  return (
    <main
      style={{
        maxWidth: "var(--max)",
        margin: "0 auto",
        padding: "clamp(1.5rem, 6vw, 3rem) 1.25rem 4rem",
      }}
    >
      <p
        className="rise"
        style={{
          fontFamily: "var(--font-body)",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontSize: "0.72rem",
          color: "var(--muted)",
          margin: 0,
        }}
      >
        Knit — social closet
      </p>

      <h1
        className="rise"
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 500,
          fontSize: "clamp(2.4rem, 9vw, 3.6rem)",
          lineHeight: 1.04,
          letterSpacing: "-0.02em",
          margin: "0.75rem 0 0",
        }}
      >
        See inside the closets you
        <span style={{ color: "var(--raspberry)" }}> can&apos;t shop</span>.
      </h1>

      <ul style={{ listStyle: "none", margin: "2.25rem 0 0", padding: 0, display: "grid", gap: "0.75rem" }}>
        {layers.map((l) => (
          <li
            key={l.tag}
            className="rise"
            style={{
              border: "1px solid var(--line)",
              borderLeft: `3px solid ${l.color}`,
              borderRadius: "0.4rem",
              padding: "0.9rem 1rem",
              background: "#fff",
            }}
          >
            <span
              style={{
                display: "inline-block",
                fontSize: "0.72rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: l.color,
                fontWeight: 600,
                marginBottom: "0.2rem",
              }}
            >
              {l.tag}
            </span>
            <div style={{ fontSize: "0.98rem" }}>{l.line}</div>
          </li>
        ))}
      </ul>

    </main>
  );
}
