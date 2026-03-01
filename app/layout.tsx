import type { Metadata } from "next";
import { Alegreya_Sans, Bitter } from "next/font/google";

import "@/app/globals.css";
import { Toaster } from "sonner";

const sans = Alegreya_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "700"]
});

const serif = Bitter({
  subsets: ["latin"],
  variable: "--font-serif",
  weight: ["500", "700"]
});

export const metadata: Metadata = {
  title: "Monthly Budget Expense Logger",
  description: "Track expenses with Supabase"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${sans.variable} ${serif.variable} min-h-screen font-[var(--font-sans)]`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
