"use client";

import { HAIRSTYLES } from "@/lib/hairstyles";

interface Props {
  selectedId: number | null;
  onSelect: (id: number) => void;
}

export default function HairstyleGrid({ selectedId, onSelect }: Props) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {HAIRSTYLES.map((style) => {
        const isSelected = selectedId === style.id;
        return (
          <button
            key={style.id}
            onClick={() => onSelect(style.id)}
            className={`flex flex-col items-center justify-center p-4 rounded-sm border transition-all active:scale-95 ${
              isSelected
                ? "border-black bg-black text-white"
                : "border-gray-200 bg-white text-black hover:border-gray-400"
            }`}
          >
            <span className="text-2xl mb-2">{style.emoji}</span>
            <span className={`text-[11px] font-bold leading-tight text-center tracking-wide ${isSelected ? "text-white" : "text-black"}`}>
              {style.nameEn}
            </span>
            {style.serviceAddOn > 0 && (
              <span className={`text-[9px] mt-1 font-semibold ${isSelected ? "text-gray-600" : "text-gray-600"}`}>
                +{style.serviceAddOn} THB
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

