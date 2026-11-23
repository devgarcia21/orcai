import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Orçaí — Orçamentos profissionais pelo WhatsApp",
    template: "%s | Orçaí",
  },
  description:
    "Crie orçamentos profissionais, envie pelo WhatsApp e receba o sinal por PIX. Feito para eletricistas, encanadores, pedreiros e oficinas.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${inter.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
