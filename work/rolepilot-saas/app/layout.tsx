import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "RolePilot | AI Job Search OS",
  description: "AI job search command center for data and cloud professionals"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
