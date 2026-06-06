"use client";

export interface Stylist {
  id: number;
  name: string;
  level: string;
  rating: number;
  priceRange: string;
  basePrice: number;
}

interface Props {
  stylist: Stylist;
  selected: boolean;
  onSelect: () => void;
}

export function StylistCard({ stylist, selected, onSelect }: Props) {
  return (
    <button
      onClick={onSelect}
      className={`flex items-center gap-4 w-full px-4 py-3.5 rounded-sm border transition-all active:scale-[0.99] text-left ${
        selected
          ? "border-black bg-black text-white"
          : "border-gray-200 bg-white text-black hover:border-gray-400"
      }`}
    >
      <div className={`w-9 h-9 rounded-sm flex items-center justify-center text-xs font-black shrink-0 ${
        selected ? "bg-white/15 text-white" : "bg-gray-100 text-black"
      }`}>
        {stylist.name.charAt(0)}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">{stylist.name}</p>
        <p className={`text-xs mt-0.5 ${selected ? "text-gray-800" : "text-gray-800"}`}>{stylist.level}</p>
      </div>
      <div className="text-right shrink-0">
        <p className={`text-xs font-bold ${selected ? "text-white" : "text-black"}`}>{stylist.priceRange} THB</p>
        <p className={`text-[10px] mt-0.5 ${selected ? "text-gray-800" : "text-gray-800"}`}>⭐ {stylist.rating}</p>
      </div>
    </button>
  );
}

export const STYLISTS: Stylist[] = [
  { id: 1, name: "Somchai", level: "Senior Stylist · 8 yrs exp.", rating: 4.9, priceRange: "500–800", basePrice: 600 },
  { id: 2, name: "Mana",    level: "Senior Stylist · 6 yrs exp.", rating: 4.8, priceRange: "400–700", basePrice: 500 },
  { id: 3, name: "Kamol",   level: "Junior Stylist · 2 yrs exp.", rating: 4.7, priceRange: "300–400", basePrice: 350 },
];

