// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Deadrails — RPG do Oeste",
  description: "Sobreviva ou vire pó no deserto. Multiplayer western RPG.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-br">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Rye&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Special+Elite&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}