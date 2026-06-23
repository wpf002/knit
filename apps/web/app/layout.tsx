import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

// Brand type: Fraunces (display serif) + Inter (body). Exposed as the CSS vars
// globals.css already references, so the whole app inherits them.
const display = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["400", "500", "600"],
  display: "swap",
});
const body = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Knit",
  description:
    "Your friends' and favorite creators' closets — rent, buy, or give away the actual pieces.",
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#2A2230",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <header className="app-bar">
          <Link href="/" className="brand" aria-label="Knit home">
            <img src="/icon.svg" alt="" width={28} height={28} />
            <span className="brand-word">Knit</span>
          </Link>
          <nav className="app-nav">
            <Link href="/feed">Feed</Link>
            <Link href="/stylist">Stylist</Link>
            <Link href="/borrows">Borrows</Link>
            <Link href="/wallet">Wallet</Link>
            <Link href="/closet">Closet</Link>
            <Link href="/closet/new" className="app-nav-cta">
              + Add
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
