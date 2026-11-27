import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppProviders } from "@/components/providers/app-providers";

export const metadata: Metadata = {
  title: "RupeeRoot — Build Better Money Habits",
  description:
    "Build better money habits. Track daily income and expenses, set monthly budgets, and understand your spending patterns.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/images/rupeeroot-logo.png",
    apple: "/images/rupeeroot-logo.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "RupeeRoot",
  },
};

export const viewport: Viewport = {
  themeColor: "#00BAF2",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans">
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
