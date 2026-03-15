import type { Metadata } from "next";
import { Exo_2, Marcellus_SC } from "next/font/google";
import "./globals.css";

const exo = Exo_2({
  variable: "--font-exo",
  subsets: ["latin"],
});

const marcellus = Marcellus_SC({
  variable: "--font-marcellus",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Coriolis Character Dossier",
  description: "Interactive mobile-first character roster for Coriolis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${exo.variable} ${marcellus.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
