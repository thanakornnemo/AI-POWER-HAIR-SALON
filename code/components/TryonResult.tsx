"use client";

interface Props {
  originalImage: string;
  generatedImage: string;
  styleName: string;
}

export default function TryonResult({ originalImage, generatedImage, styleName }: Props) {
  return (
    <div className="space-y-3">
      <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-gray-800">{styleName}</p>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <p className="text-[10px] text-gray-800 font-bold text-center tracking-widest uppercase">Before</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={originalImage} alt="Before" className="w-full aspect-square object-cover rounded-sm border border-gray-200" />
        </div>
        <div className="space-y-1.5">
          <p className="text-[10px] text-gray-800 font-bold text-center tracking-widest uppercase">After</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={generatedImage} alt="After" className="w-full aspect-square object-cover rounded-sm border border-gray-200" />
        </div>
      </div>
    </div>
  );
}

