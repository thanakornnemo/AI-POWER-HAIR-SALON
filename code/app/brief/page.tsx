"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loadTryonResult, TryonResult } from "@/lib/store";

export default function BriefPage() {
  const router = useRouter();
  const [result, setResult] = useState<TryonResult | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => { setResult(loadTryonResult()); setLoaded(true); }, []);
  if (!loaded) return null;

  if (!result) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center space-y-4 min-h-screen bg-white">
        <p className="text-4xl text-gray-200">▤</p>
        <h2 className="text-xl font-black text-black">No Brief Yet</h2>
        <p className="text-gray-600 text-sm">Complete a Try-On first.</p>
        <button onClick={() => router.push("/tryon")}
          className="inline-block mt-2 bg-black text-white px-8 py-3 rounded-sm font-bold text-sm">
          Start Try-On →
        </button>
      </div>
    );
  }

  const a = result.analysis;

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 space-y-6 min-h-screen bg-white">
      <div className="flex items-center gap-4 border-b border-gray-100 pb-4">
        <button onClick={() => router.back()} className="text-gray-600 hover:text-black text-sm font-semibold transition-colors">← Back</button>
        <p className="text-[11px] font-bold tracking-[0.25em] uppercase text-gray-600">Technical Brief · Stylist Copy</p>
      </div>

      {/* Analysis card image */}
      {result.generatedImage && (
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={result.generatedImage} alt="Analysis Card" className="w-full rounded-sm border border-gray-100" />
          <a href={result.generatedImage} download="hair-analysis.png"
            className="mt-3 w-full border border-gray-300 py-3 rounded-sm text-sm font-semibold text-gray-700 hover:text-gray-950 hover:border-gray-500 transition-colors flex items-center justify-center gap-2">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v8M5 7l3 3 3-3M2 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Save Card
          </a>
        </div>
      )}

      {/* Text brief (Pro only — has full analysis) */}
      {a && result.isPro && (
        <div className="space-y-4 border border-gray-900 rounded-sm p-5 font-mono text-xs leading-relaxed">
          <p className="font-black text-sm text-gray-950 tracking-widest uppercase">Technical Brief — Pro</p>

          <Section title="Hair Profile">
            <Row label="Face Shape" value={a.face_shape} />
            <Row label="Hair" value={`${a.hair_texture} / ${a.hair_density}`} />
            <Row label="Natural Color" value={a.natural_hair_color} />
            {a.color.bleach_required !== null && (
              <Row label="Bleached Before" value={a.color.bleach_required ? "Yes" : "No"} />
            )}
          </Section>

          <Section title="Recommended Style">
            <Row label="Best Match" value={a.best_match.name} />
            <Row label="Match Score" value={`${a.best_match.match_score}%`} />
            <Row label="Fade" value={a.best_match.fade_level} />
            <Row label="Top Length" value={`${a.best_match.top_length_cm} cm`} />
            <Row label="Parting" value={a.parting_recommendation} />
            <Row label="Fringe" value={a.fringe_recommendation} />
          </Section>

          {a.color.formula && (
            <Section title="Hair Color">
              <Row label="Formula" value={a.color.formula} />
              {a.color.developer_vol && <Row label="Developer" value={`${a.color.developer_vol} vol.`} />}
              <Row label="Note" value={a.color.bleach_required ? "Bleach required first" : "No bleach needed"} />
            </Section>
          )}

          {a.celebrity_ref && (
            <Section title="Celebrity Reference">
              <Row label="Reference" value={a.celebrity_ref.name} />
              <p className="text-gray-600 mt-1">{a.celebrity_ref.similarity_reason}</p>
            </Section>
          )}

          <Section title="Summary">
            <p className="text-gray-700 leading-relaxed">{a.summary}</p>
          </Section>

          <p className="text-gray-400 text-[10px] border-t border-gray-100 pt-3 mt-2">
            AI-Powered Hair Salon · PDPA Protected · ใช้ภายในร้านเท่านั้น
          </p>
        </div>
      )}

      <button onClick={() => router.push("/booking")}
        className="w-full bg-gray-950 text-white py-4 rounded-sm font-black text-sm tracking-wide hover:bg-gray-800 transition-all">
        Book This Look →
      </button>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-gray-100 pt-3">
      <p className="text-[10px] font-black tracking-[0.25em] uppercase text-gray-500 mb-2">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-gray-400 w-24 shrink-0">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}
