import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "password-manager",
  description: "Personal end-to-end-encrypted password manager",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}