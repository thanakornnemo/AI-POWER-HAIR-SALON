import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "AI-Powered Hair Salon",
  description: "Try any hairstyle on your real face before you cut",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
      </head>
      <body>
        <Nav />
        <main className="min-h-screen pb-20 md:pb-0">
          {children}
        </main>
      </body>
    </html>
  );
}
