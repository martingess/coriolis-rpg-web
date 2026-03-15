import type { Metadata } from "next";
import { Exo_2, Marcellus_SC } from "next/font/google";

import { I18nProvider } from "@/components/i18n-provider";

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
  title: "Coriolis Dossier",
  description: "Interactive character and crew roster for Coriolis.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${exo.variable} ${marcellus.variable} antialiased`}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
