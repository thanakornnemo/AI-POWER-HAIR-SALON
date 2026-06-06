export interface Hairstyle {
  id: number;
  name: string;
  nameEn: string;
  emoji: string;
  priceLabel: string;
  serviceAddOn: number;
  description: string;
  brief: {
    side: string;
    top: string;
    back: string;
  };
}

export const HAIRSTYLES: Hairstyle[] = [
  {
    id: 1,
    name: "ทรงสั้นทั่วไป",
    nameEn: "Classic Short",
    emoji: "💈",
    priceLabel: "+0",
    serviceAddOn: 0,
    description: "classic short cut, uniform length around 1-2 inches, clean and neat",
    brief: {
      side: "Straight cut · 1 inch",
      top: "2 inches · standard texture",
      back: "Straight neckline",
    },
  },
  {
    id: 2,
    name: "ทรง Fade สั้น",
    nameEn: "Low Fade",
    emoji: "✂️",
    priceLabel: "+0",
    serviceAddOn: 0,
    description: "low fade haircut, hair fades from skin at the bottom, longer on top",
    brief: {
      side: "Low Fade #0–1 from temple down",
      top: "2.5 inches · standard texture",
      back: "Fade #0 · curved neckline",
    },
  },
  {
    id: 3,
    name: "ทรง Fade กลาง",
    nameEn: "Mid Fade",
    emoji: "🔥",
    priceLabel: "+50",
    serviceAddOn: 50,
    description: "mid fade haircut, fade starts at mid-ear level, textured top",
    brief: {
      side: "Mid Fade #1–2 from mid-ear",
      top: "3 inches · rough texture",
      back: "Fade #1 · curved to head shape",
    },
  },
  {
    id: 4,
    name: "ทรงยาวปานกลาง",
    nameEn: "Medium Length",
    emoji: "🌊",
    priceLabel: "+0",
    serviceAddOn: 0,
    description: "medium length hair, about 4-5 inches on top, natural flow",
    brief: {
      side: "3 inches · natural texture",
      top: "4–5 inches · no texturizing",
      back: "Curved to head · down to nape",
    },
  },
  {
    id: 5,
    name: "ทรงหนังสือ",
    nameEn: "Crew Cut",
    emoji: "⚡",
    priceLabel: "+0",
    serviceAddOn: 0,
    description: "crew cut, very short uniform length all around, military style",
    brief: {
      side: "#2 all around",
      top: "0.5 inch · standard texture",
      back: "#2 · straight neckline",
    },
  },
  {
    id: 6,
    name: "ทรงผมสีอ่อน",
    nameEn: "Light Color",
    emoji: "✨",
    priceLabel: "+200",
    serviceAddOn: 200,
    description: "medium length hair with light brown or blonde coloring, stylish and modern",
    brief: {
      side: "Mid Fade #2+",
      top: "3 inches · blonde / light brown recommended",
      back: "Fade · curved + continuous color",
    },
  },
];
