"use client";

import { HAIRSTYLES } from "@/lib/hairstyles";

interface Props {
  styleId: number;
  originalImage?: string;
  generatedImage?: string;
}

export default function TechnicalBrief({ styleId, originalImage, generatedImage }: Props) {
  const style = HAIRSTYLES.find((s) => s.id === styleId) ?? HAIRSTYLES[0];

  return (
    <div className="space-y-5">
      <div className="border border-gray-200 rounded-sm p-4">
        <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-gray-800 mb-1">Selected Style</p>
        <p className="text-2xl font-black text-black">{style.emoji} {style.nameEn}</p>
        <p className="text-sm text-gray-800 mt-0.5">{style.name}</p>
      </div>

      <div className="border border-gray-200 rounded-sm p-4 space-y-3">
        <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-gray-800">Technical Specs</p>
        {[
          { label: "Sides", value: style.brief.side },
          { label: "Top",   value: style.brief.top },
          { label: "Back",  value: style.brief.back },
        ].map(({ label, value }) => (
          <div key={label} className="flex items-start gap-4 border-t border-gray-100 pt-3 first:border-0 first:pt-0">
            <span className="text-[10px] font-black text-gray-300 w-8 shrink-0 pt-0.5 tracking-widest uppercase">{label}</span>
            <span className="text-sm text-gray-900 leading-relaxed">{value}</span>
          </div>
        ))}
      </div>

      {originalImage && generatedImage && (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] text-gray-800 mb-1.5 text-center tracking-widest uppercase">Before</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={originalImage} alt="before" className="w-full aspect-square object-cover rounded-sm border border-gray-200" />
          </div>
          <div>
            <p className="text-[10px] text-gray-800 mb-1.5 text-center tracking-widest uppercase">After</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={generatedImage} alt="after" className="w-full aspect-square object-cover rounded-sm border border-gray-200" />
          </div>
        </div>
      )}

      <div className="border border-gray-200 rounded-sm p-4">
        <p className="text-xs font-bold text-black mb-1">Stylist Note</p>
        <p className="text-sm text-gray-900">Assess actual hair condition and texture before proceeding.</p>
      </div>

      <div className="border border-gray-100 rounded-sm p-3">
        <p className="text-[11px] text-gray-800 leading-relaxed">
          🔒 PDPA — This Technical Brief is for in-salon use only and must not be shared externally.
        </p>
      </div>
    </div>
  );
}

