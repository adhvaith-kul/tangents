import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tangents",
  description: "A social media simulator: every account but yours is simulated.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
