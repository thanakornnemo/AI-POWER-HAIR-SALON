"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { isProMode, activateProMode, deactivateProMode } from "@/lib/store";

const features = [
  { num: "01", label: "AI Virtual Try-On",  desc: "See any hairstyle rendered on your real face before committing to the cut." },
  { num: "02", label: "Technical Brief",     desc: "Precise cut instructions generated and sent directly to your stylist." },
  { num: "03", label: "Instant Booking",     desc: "Reserve your slot and confirm your chosen look in seconds." },
  { num: "04", label: "Style History",       desc: "Every visit and style choice archived in your personal profile." },
];

export default function HomePage() {
  const [pro, setPro] = useState(false);
  const [activating, setActivating] = useState(false);
  const [highlight, setHighlight] = useState(false);
  const [flashBtn, setFlashBtn] = useState(false);
  const belowHeroRef = useRef<HTMLElement>(null);
  const searchParams = useSearchParams();

  useEffect(() => { setPro(isProMode()); }, []);

  const triggerFlash = () => {
    setHighlight(true);
    setFlashBtn(true);
    setTimeout(() => { setHighlight(false); setFlashBtn(false); }, 1800);
  };

  useEffect(() => {
    if (searchParams.get("highlight") === "pro") {
      triggerFlash();
    }
  }, [searchParams]);

  const scrollToBelowHero = () => {
    belowHeroRef.current?.scrollIntoView({ behavior: "smooth" });
    triggerFlash();
  };

  const handleActivate = () => {
    setActivating(true);
    setTimeout(() => { activateProMode(); setPro(true); setActivating(false); }, 1200);
  };
  const handleDeactivate = () => { deactivateProMode(); setPro(false); };

  return (
    <div className="bg-white">

      {/* ── Hero: full-viewport image ── */}
      <section className="relative h-[calc(110vh-57px)] min-h-[620px] w-full overflow-hidden">
        <Image
          src="/images/clipper-comb.jpg"
          alt="Hair salon"
          fill
          className="object-cover object-center grayscale-[50%] scale-105 contrast-50 brightness-100"
          priority
        />
        {/* layered overlay: darker at bottom for text legibility */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/80 to-black/100" />

        {/* centered content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center gap-0">

          {/* badge */}
          <span className="inline-block text-[11px] font-bold tracking-[0.28em] uppercase text-white/75 border border-white/30 px-4 py-1.5 rounded-full mb-7">
            Phygital Salon · Bangkok
          </span>

          {/* headline with gradient text */}
          <h1 className="font-black leading-[1.0] tracking-tight mb-5 drop-shadow-md">
            <span className="block text-5xl md:text-6xl lg:text-7xl text-white">AI-Powered</span>
            <span className="block text-5xl md:text-6xl lg:text-7xl text-white">
              Hair Salon
            </span>
          </h1>

          {/* subtext in bordered pill */}
          <p className="text-white/85 text-base md:text-lg mb-8 max-w-xs leading-relaxed">
            Try any hairstyle on your real face — before you cut.
          </p>

          {/* CTA pill button */}
          <Link
            href="/tryon"
            className="inline-flex items-center gap-2.5 bg-white text-black text-sm font-black px-9 py-4 rounded-full hover:bg-gray-100 active:scale-95 transition-all tracking-wide shadow-xl shadow-black/30"
          >
            Try AI Hairstyle
            <svg width="13" height="13" viewBox="0 0 14 14" fill="none">
              <path d="M1 7h12M8 2l5 5-5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>

          {/* scroll hint */}
          <button onClick={scrollToBelowHero} className="absolute bottom-[12vh] text-white/50 hover:text-white/80 text-[11px] tracking-[0.2em] uppercase font-semibold transition-colors cursor-pointer">Scroll to explore ↓</button>
        </div>
      </section>

      {/* ── Pro Mode ── */}
      <section id="pro" ref={belowHeroRef} className="max-w-3xl mx-auto px-6 py-12 md:py-14">
        <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-gray-600 mb-6">(Pro)</p>

        {pro ? (
          /* ── Active: white bg, black border, black font ── */
          <div className="border border-gray-900 rounded-sm p-5 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-black text-gray-950 text-lg mb-1">Pro Mode Active</p>
                <p className="text-gray-700 text-sm">Full AI access · Technical Brief · <strong className="text-gray-950">50 THB off</strong> every visit</p>
              </div>
              <button
                onClick={handleDeactivate}
                className="shrink-0 border border-gray-300 text-gray-600 text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-sm hover:border-gray-900 hover:text-gray-950 transition-colors self-start sm:self-auto"
              >
                Cancel Pro
              </button>
            </div>
          </div>
        ) : (
          <div className={`border border-gray-200 rounded-sm p-5 md:p-6 ${highlight ? "animate-border-flash" : ""}`}>
            <div className="flex flex-col sm:flex-row sm:items-start gap-4 mb-5">
              <div className="flex-1">
                <h2 className="font-black text-gray-950 text-xl md:text-2xl mb-2">Unlock Pro Mode</h2>
                <p className="text-gray-700 text-sm leading-relaxed max-w-sm">
                  Full AI Try-On · Technical Brief sent to stylist · <strong className="text-gray-950">50 THB off</strong> every in-salon visit.
                </p>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <p className="text-4xl font-black text-gray-950 leading-none">50</p>
                <p className="text-gray-600 text-xs mt-0.5">THB / one-time</p>
              </div>
            </div>
            <button
              onClick={handleActivate}
              disabled={activating}
              className={`w-full bg-gray-950 text-white py-3.5 rounded-sm font-black text-sm tracking-wide hover:bg-gray-800 active:scale-[0.99] transition-all disabled:opacity-40 ${flashBtn ? "animate-btn-flash" : ""}`}
            >
              {activating ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Processing...
                </span>
              ) : "Activate Pro · 50 THB"}
            </button>
            <p className="text-gray-600 text-[11px] text-center mt-2">Deposit redeemable as 50 THB off your salon bill</p>
          </div>
        )}
      </section>

      <div className="max-w-3xl mx-auto px-6"><div className="border-t border-gray-150" /></div>

      {/* ── AI banner ── */}
      <section className="max-w-3xl mx-auto px-6 py-12 md:py-14">
        <div className="relative rounded-sm overflow-hidden h-44 md:h-56 bg-black">
          <Image src="/images/ai-head.jpg" alt="AI visualization" fill
            className="object-cover object-center grayscale opacity-50" />
          <div className="absolute inset-0 bg-gradient-to-r from-black via-black/60 to-transparent" />
          <div className="absolute inset-0 flex items-end px-6 md:px-8 pb-6 md:pb-8">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-white/55 mb-2">Powered by OpenAI gpt-image-1</p>
              <p className="text-white font-black text-2xl md:text-4xl tracking-tight leading-none">Virtual Try-On</p>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-3xl mx-auto px-6"><div className="border-t border-gray-100" /></div>

      {/* ── Features ── */}
      <section className="max-w-3xl mx-auto px-6 py-12 pb-16 md:pb-20">
        <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-gray-600 mb-6">(Services)</p>
        <div>
          {features.map((f, i) => (
            <div
              key={f.label}
              className={`flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 py-5 ${i < features.length - 1 ? "border-b border-gray-150" : ""}`}
            >
              <span className="text-[10px] font-bold text-gray-500 tracking-widest w-6 shrink-0">{f.num}</span>
              <p className="font-black text-gray-950 text-base sm:w-44 shrink-0">{f.label}</p>
              <p className="text-gray-700 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
}
