import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../lib/firebase/auth-context";

export const metadata: Metadata = {
  title: "SOS Print — Printing at Shakeel Online Services, Guntur",
  description: "Official printing portal for Shakeel Online Services, Guntur. Fast, affordable document, photo and ID card printing powered by SOS Print.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
