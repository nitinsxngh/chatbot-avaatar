import Nav from "@/components/Nav";
import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Chatbot Avatar",
  description: "Ingest, configure, and chat with your RAG assistant",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <Nav />
        <main className="mx-auto max-w-[1280px] px-4 py-4 sm:px-6">{children}</main>
      </body>
    </html>
  );
}
