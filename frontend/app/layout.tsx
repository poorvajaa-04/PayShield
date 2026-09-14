import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PayShield",
  description: "Financial fraud investigation and decision engine",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}