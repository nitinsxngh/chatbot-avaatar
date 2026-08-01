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
    <html lang="en" className="h-full overflow-hidden">
      <body className="flex h-full flex-col overflow-hidden">
        <Nav />
        <main className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
