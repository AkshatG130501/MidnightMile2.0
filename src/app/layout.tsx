import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Midnight Mile - Security in every step",
  description:
    "A map-first personal safety app for secure navigation and peace of mind",
  keywords: ["safety", "navigation", "security", "maps", "personal safety"],
  authors: [{ name: "Midnight Mile Team" }],
  viewport:
    "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body
        className={`${inter.variable} font-sans antialiased h-full bg-white text-midnight-navy`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
