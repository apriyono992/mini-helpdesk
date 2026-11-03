import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// @next-codemod-ignore Cache Components adoption: this segment temporarily allows blocking.
// Remove this opt-out after verifying the segment passes validation without it.
// See: https://nextjs.org/docs/app/guides/migrating-to-cache-components

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: "HelpDesk",
  description: "Multi-tenant helpdesk ticketing",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`h-full ${inter.variable}`}>
      <body className="min-h-full bg-gray-50 text-gray-900 antialiased font-sans">{children}</body>
    </html>
  );
}
