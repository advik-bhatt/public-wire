import type { Metadata } from "next";
import { PageTransition } from "@/components/page-transition";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rolemate | Proof infrastructure for technical hiring",
  description:
    "Rolemate turns technical work, proof missions, GitHub, projects, and job context into role-specific evidence maps, gap plans, referral context, and hiring signal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full bg-background text-foreground font-sans">
        <PageTransition>{children}</PageTransition>
      </body>
    </html>
  );
}
