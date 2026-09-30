import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Call Authright | Phone Service Demo",
  description: "Call and speak with an AI phone assistant.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
