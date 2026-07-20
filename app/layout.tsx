import type { Metadata } from "next";
import { PageTransition } from "@/components/page-transition";
import "./globals.css";

export const metadata: Metadata = {
  title: "PublicWire · Evidence-backed civic investigations",
  description:
    "PublicWire is designed to capture civic source changes, verify material claims, and publish only after deterministic evidence and reliability gates pass.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground font-sans">
        <a href="#main-content" className="skip-link">
          Skip to content
        </a>
        <div id="main-content" tabIndex={-1}>
          <PageTransition>{children}</PageTransition>
        </div>
      </body>
    </html>
  );
}
