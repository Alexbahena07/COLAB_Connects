import type { Metadata } from "next";
import "./globals.css";
import { Montserrat, Libre_Baskerville } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
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
  title: "COLAB Connects",
  description: "Metrics-first hiring for early-career finance talent.",
  icons: {
    icon: [
      { url: "/icon.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
  },
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <body className={`${montserrat.variable} ${libre.variable}`}>
        <Providers session={session}>{children}</Providers>
        <Analytics />
      </body>
    </html>
  );
}
