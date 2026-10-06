import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../lib/firebase/auth-context";

export const metadata: Metadata = {
  title: "S2P — Scan 2 Print | Shakeel Online Services",
  description: "Real Scan-to-Print Operating System for Shakeel Online Services",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-[#090d0b] text-[#f8fafc] selection:bg-emerald-500 selection:text-white">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
