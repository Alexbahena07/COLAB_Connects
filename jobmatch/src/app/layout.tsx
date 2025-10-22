import type { Metadata } from "next";
import "./globals.css";
import { Montserrat, Libre_Baskerville } from "next/font/google";
import Providers from "./providers";

const montserrat = Montserrat({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-sans",
  display: "swap",
});

const libre = Libre_Baskerville({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-serif",
  display: "swap",
});

export const metadata: Metadata = {
  title: "COLAB connects",
  description: "Metrics-first hiring",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${montserrat.variable} ${libre.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
