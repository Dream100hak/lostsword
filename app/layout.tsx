import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LostSword Editor",
  description: "Compose cards, characters, and pets onto a canvas."
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen bg-slate-900 text-white antialiased">
        {children}
      </body>
    </html>
  );
}
