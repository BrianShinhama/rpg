// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Western Tales RPG",
  description: "Sistema de RPG de Mesa — Fichas & Campanhas",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-br">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Rye&family=Special+Elite&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <SiteNav />
        {children}
      </body>
    </html>
  );
}

/* ─── Barra de navegação ──────────────────────────────────── */
function SiteNav() {
  return (
    <nav className="nav-west">
      {/* Brand */}
      <Link href="/" className="nav-brand" style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <StarIcon />
        Western Tales
      </Link>

      {/* Links */}
      <Link href="/fichas"  className="nav-link">Fichas</Link>
      <Link href="/sessao"  className="nav-link">Sessão</Link>
      <Link href="/manual"  className="nav-link" style={{ opacity: 0.45 }}>Campanhas</Link>

      {/* Ornamento direito */}
      <span style={{
        fontFamily: "var(--font-display)",
        fontSize: "0.65rem",
        color: "var(--gold-dim)",
        letterSpacing: "0.18em",
        textTransform: "uppercase",
        marginLeft: 8,
      }}>
        v1.0
      </span>
    </nav>
  );
}

function StarIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"
      style={{ color: "var(--gold)", flexShrink: 0 }}>
      <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
    </svg>
  );
}