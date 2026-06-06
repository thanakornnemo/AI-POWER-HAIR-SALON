"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/",        label: "Home"    },
  { href: "/tryon",   label: "Try-On"  },
  { href: "/booking", label: "Book"    },
  { href: "/profile", label: "Profile" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      {/* ── Desktop top nav ── */}
      <nav className="hidden md:flex items-center justify-between px-10 bg-black sticky top-0 z-50 h-[57px] overflow-hidden">
        <Link href="/" className="flex items-center gap-3 h-full">
          <div className="h-[76%] aspect-square overflow-hidden relative">
            <Image src="/images/logo.png" alt="AI Salon" width={114} height={114} quality={100} className="absolute inset-0 w-full h-[125%] object-cover object-top" />
          </div>
          <span className="font-medium text-xs tracking-[0.10em] uppercase text-white/75">AI Hair Salon</span>
        </Link>
        <div className="flex items-center gap-8">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`text-sm font-semibold transition-colors pb-0.5 relative ${
                pathname === tab.href
                  ? "text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-px after:bg-white"
                  : "text-white/50 hover:text-white"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* ── Mobile bottom nav ── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-black border-t border-white/10">
        <div className="flex">
          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex-1 flex flex-col items-center py-3 gap-0.5 text-[10px] font-bold tracking-widest uppercase transition-colors ${
                pathname === tab.href ? "text-white" : "text-white/30"
              }`}
            >
              <span>{tab.label}</span>
              {pathname === tab.href && <span className="w-3 h-px bg-white" />}
            </Link>
          ))}
        </div>
      </nav>
    </>
  );
}
