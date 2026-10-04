import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "saas-ops",
  description: "Estado de todos os SaaS num só sítio.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-PT">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
