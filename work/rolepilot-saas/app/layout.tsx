import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RolePilot | AI-powered job search workspace",
  description: "Track, match, and tailor every data and cloud job application in one AI-powered workspace."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
