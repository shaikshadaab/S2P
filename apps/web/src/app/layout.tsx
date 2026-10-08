import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "../lib/firebase/auth-context";

export const metadata: Metadata = {
  title: "Shakeel Online Services — Print Documents & Photos | SOS Print",
  description: "Quick, hassle-free document and photo printing at Shakeel Online Services, Guntur.",
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
