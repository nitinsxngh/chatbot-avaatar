"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/rag", label: "RAG" },
  { href: "/ingest", label: "Ingest" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <header className="shrink-0 border-b border-black/[0.06] bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex h-11 max-w-[1280px] items-center justify-between px-4 sm:px-6">
        <Link href="/rag" className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#0071e3] text-[11px] font-semibold text-white">
            C
          </div>
          <span className="text-[14px] font-semibold tracking-tight text-[#1d1d1f]">
            Chatbot Avatar
          </span>
        </Link>

        <nav className="flex rounded-full bg-[#f5f5f7] p-0.5">
          {links.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-all duration-200 ${
                  active
                    ? "bg-white text-[#1d1d1f] shadow-sm"
                    : "text-[#86868b] hover:text-[#1d1d1f]"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
