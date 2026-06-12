import type { Metadata } from "next";
import "./globals.css";
import { RegisterServiceWorker } from "./register-sw";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Smashers Club - Sports Management",
  description: "Sports club management system for badminton and cricket with ELO rankings",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Smashers Club",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "Smashers Club",
    title: "Smashers Club - Sports Management",
    description: "Sports club management system for badminton and cricket",
  },
  twitter: {
    card: "summary",
    title: "Smashers Club",
    description: "Sports club management system",
  },
};

export const viewport = {
  themeColor: "#3B82F6",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <head>
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0, viewport-fit=cover" />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeProvider>
          <RegisterServiceWorker />
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
