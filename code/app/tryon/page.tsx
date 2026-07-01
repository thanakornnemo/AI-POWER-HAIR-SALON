"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import ImageUpload from "@/components/ImageUpload";
import { isProMode, saveTryonResult, saveScan, AnalysisJSON, loadUserProfile } from "@/lib/store";

type Step = "upload" | "preview" | "qa" | "analyzing" | "result";

const STEPS = [
  { key: "upload", num: "01", label: "Scan" },
  { key: "qa",     num: "02", label: "Style" },
  { key: "result", num: "03", label: "Result" },
] as const;

interface QAAnswers {
  desired_style: string;
  current_color: string;
  bleached_before: boolean;
  target_color: string;
  lifestyle: string;
}

const QA_DEFAULTS: QAAnswers = {
  desired_style: "",
  current_color: "",
  bleached_before: false,
  target_color: "",
  lifestyle: "",
};

const QA_SUGGESTIONS_MALE = {
  desired_style: ["Two Block", "Comma Hair", "Side Part", "Taper Fade", "Textured Crop", "ไม่ระบุ"],
  current_color: ["ดำธรรมชาติ", "น้ำตาลเข้ม", "น้ำตาลอ่อน", "เคยฟอกแล้ว"],
  target_color: ["ไม่ต้องการเปลี่ยนสี", "Ash Brown", "Dark Brown", "Ash Black", "Soft Black"],
  lifestyle: ["ทำงานออฟฟิศ", "นักศึกษา", "ชอบดูแลผม", "ต้องการความง่าย", "ไลฟ์สไตล์แอคทีฟ"],
};

const QA_SUGGESTIONS_FEMALE = {
  desired_style: ["Wolf Cut", "Hush Cut", "Bob Cut", "Lob", "Curtain Bangs", "ไม่ระบุ"],
  current_color: ["ดำธรรมชาติ", "น้ำตาลเข้ม", "น้ำตาลอ่อน", "เคยฟอกแล้ว"],
  target_color: ["ไม่ต้องการเปลี่ยนสี", "Ash Brown", "Mocha Brown", "Honey Blonde", "Soft Black"],
  lifestyle: ["ทำงานออฟฟิศ", "นักศึกษา", "ชอบดูแลผม", "ต้องการความง่าย", "ไลฟ์สไตล์แอคทีฟ"],
};

export default function TryonPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("upload");
  const [image, setImage] = useState<string | null>(null);
  const [qa, setQa] = useState<QAAnswers>(QA_DEFAULTS);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [photoOk, setPhotoOk] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [skippedWarning, setSkippedWarning] = useState<string | null>(null);
  const [cardImage, setCardImage] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisJSON | null>(null);
  const [loadingMsg, setLoadingMsg] = useState("");

  const [isPro, setIsPro] = useState(false);
  const [userSex, setUserSex] = useState<"male" | "female" | null>(null);

  useEffect(() => {
    setIsPro(isProMode());
    setUserSex(loadUserProfile()?.sex ?? "female");
  }, []);

  const stepIndex = step === "upload" || step === "preview" ? 0
    : step === "qa" ? 1
    : 2;

  const handleImageSelected = async (base64: string) => {
    if (!base64) { setImage(null); return; }
    setImage(base64);
    setWarning(null);
    setPhotoOk(null);
    setChecking(true);
    setStep("preview");
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64, checkOnly: true }),
        cache: "no-store",
      });
      const data = await res.json();
      if (data.unsuitable) {
        setWarning(data.reason);
        setPhotoOk(false);
      } else {
        setPhotoOk(true);
      }
    } catch {
      setPhotoOk(true); // fail open — don't block on check error
    } finally {
      setChecking(false);
    }
  };

  const handleConfirm = (forceSkip = false) => {
    if (!image) return;
    const skip = forceSkip || photoOk === true;
    const savedWarning = forceSkip ? warning : null;
    if (savedWarning) setSkippedWarning(savedWarning);
    if (isPro) {
      setStep("qa");
    } else {
      runAnalysis(image, false, null, skip, savedWarning);
    }
  };

  const runAnalysis = async (img: string, pro: boolean, qaAnswers: QAAnswers | null, skipCheck = false, photoWarn: string | null = null) => {
    setStep("analyzing");
    setError(null);
    setWarning(null);
    try {
      // Step 1: Analyze
      setLoadingMsg("Analysing your face and hair...");
      const analyzeRes = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: img, isPro: pro, additionalContext: qaAnswers, skipCheck, sex: userSex }),
      });
      const analyzeData = await analyzeRes.json();
      if (!analyzeRes.ok) throw new Error(analyzeData.error ?? "Analysis failed");

      if (analyzeData.unsuitable) {
        setWarning(analyzeData.reason);
        setStep("preview");
        return;
      }

      const analysisResult: AnalysisJSON = analyzeData.analysis;
      setAnalysis(analysisResult);

      // Step 2: Generate card
      setLoadingMsg("Generating your hair analysis card...");
      const cardRes = await fetch("/api/card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: img, analysis: analysisResult, isPro: pro, photoWarning: photoWarn, sex: userSex, additionalContext: qaAnswers }),
      });
      const cardData = await cardRes.json();
      if (!cardRes.ok) throw new Error(cardData.error ?? "Card generation failed");

      setCardImage(cardData.image);
      try {
        saveTryonResult({
          selectedStyle: analysisResult.best_match.name,
          styleIndex: 0,
          analysis: analysisResult,
          isPro: pro,
          qaAnswers: qaAnswers ?? null,
        });
      } catch { /* localStorage full — non-critical */ }
      try {
        saveScan({
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          type: pro ? "ai-pro" : "ai-free",
          bestMatch: analysisResult.best_match.name,
          faceShape: analysisResult.face_shape,
          personalColor: analysisResult.personal_color,
          skinTone: analysisResult.skin_tone,
          hairTexture: analysisResult.hair_texture,
          hairDensity: analysisResult.hair_density,
          maintenance: analysisResult.best_match.maintenance,
          summary: analysisResult.summary.slice(0, 120),
          topColors: analysisResult.color.recommended.slice(0, 3).map((c) => c.name),
          goodOptions: analysisResult.good_options.slice(0, 3).map((s) => s.name),
          notRecommended: analysisResult.not_recommended.slice(0, 3).map((s) => s.name),
          careTips: analysisResult.care_tips?.slice(0, 3),
          careTipsTh: analysisResult.care_tips_th?.slice(0, 3),
          celebrityRef: analysisResult.celebrity_ref?.name,
          cuttingGuide: analysisResult.cutting_guide ?? null,
          cuttingGuideTh: analysisResult.cutting_guide_th ?? null,
          qaAnswers: qaAnswers ?? null,
          colorFormula: analysisResult.color.formula ?? undefined,
          colorDeveloper: analysisResult.color.developer_vol,
          colorBleach: analysisResult.color.bleach_required,
        });
      } catch { /* localStorage full — history not saved */ }
      setStep("result");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Something went wrong. Please try again.");
      setStep(isPro ? "qa" : "preview");
    }
  };

  const handleQASubmit = () => {
    if (!image) return;
    runAnalysis(image, true, qa, true, skippedWarning);
  };

  const headings = ["Scan Your Face", "Your Style", "Your Analysis"];
  const subtitles = ["Front-facing · good lighting · no obstructions", "Pro — tell us what you want", ""];
  const displayStepIndex = step === "analyzing" ? 2 : stepIndex;

  return (
    <div className="min-h-screen bg-white">

      {/* ── Header with horizontal stepper ── */}
      <div className="border-b border-gray-100 px-6 pt-6 pb-4 md:pt-8 md:pb-5">
        <div className="max-w-3xl mx-auto space-y-5">

          {/* Step progress bar */}
          <div className="flex items-center gap-0">
            {STEPS.map((s, i) => {
              const done   = i < displayStepIndex;
              const active = i === displayStepIndex;
              const locked = !isPro && s.key === "qa";
              return (
                <div key={s.key} className="flex items-center" style={{ flex: i < STEPS.length - 1 ? "1 1 0" : "0 0 auto" }}>
                  {locked ? (
                    <Link href="/?highlight=pro#pro" className="group flex items-center justify-center rounded-full shrink-0 w-7 h-7 bg-gray-200 hover:bg-gray-300 transition-all duration-200">
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <rect x="2" y="5" width="8" height="6" rx="1" stroke="#9ca3af" strokeWidth="1.5"/>
                        <path d="M4 5V3.5a2 2 0 0 1 4 0V5" stroke="#9ca3af" strokeWidth="1.5" strokeLinecap="round"/>
                      </svg>
                    </Link>
                  ) : (
                    <div className={`flex items-center justify-center rounded-full shrink-0 transition-all duration-300 ${
                      done    ? "w-7 h-7 bg-gray-950"
                      : active ? "w-8 h-8 bg-gray-950 ring-4 ring-gray-200"
                      :          "w-7 h-7 bg-gray-200"
                    }`}>
                      {done ? (
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      ) : (
                        <span className={`text-[10px] font-black leading-none ${active ? "text-white" : "text-gray-500"}`}>
                          {s.num}
                        </span>
                      )}
                    </div>
                  )}
                  {i < STEPS.length - 1 && (
                    <div className="flex-1 h-px mx-2 relative overflow-hidden bg-gray-200 rounded-full">
                      <div className={`absolute inset-y-0 left-0 bg-gray-950 transition-all duration-500 ${done ? "w-full" : "w-0"}`} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Step labels row */}
          <div className="flex items-start">
            {STEPS.map((s, i) => {
              const done   = i < displayStepIndex;
              const active = i === displayStepIndex;
              const locked = !isPro && s.key === "qa";
              return (
                <div key={s.key} className={`transition-all duration-300 ${i < STEPS.length - 1 ? "flex-1" : ""}`}>
                  {locked ? (
                    <Link href="/?highlight=pro#pro" className="group">
                      <p className="text-[10px] font-black tracking-[0.2em] uppercase text-gray-400 group-hover:text-gray-700 transition-colors">
                        {s.num} · {s.label}
                        <span className="ml-1 text-[9px] font-bold normal-case tracking-normal border border-gray-300 group-hover:border-gray-600 px-1.5 py-0.5 rounded-full transition-colors">Pro</span>
                      </p>
                    </Link>
                  ) : (
                    <p className={`text-[10px] font-black tracking-[0.2em] uppercase ${
                      active ? "text-gray-950" : done ? "text-gray-600" : "text-gray-600"
                    }`}>
                      {s.num} · {s.label}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Page title */}
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-gray-950 tracking-tight leading-none">
              {step === "analyzing" ? "Analysing..." : headings[displayStepIndex]}
            </h1>
            {step !== "analyzing" && subtitles[displayStepIndex] && (
              <p className="text-gray-600 text-sm mt-2">{subtitles[displayStepIndex]}</p>
            )}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-3xl mx-auto px-6 pt-2 pb-8 md:pt-3 md:pb-10">

            {/* Step 1 — Scan */}
            {step === "upload" && (
              <ImageUpload onImageSelected={handleImageSelected} currentImage={image} />
            )}

            {/* Step 1b — Preview */}
            {step === "preview" && image && (
              <div className="flex flex-col items-center gap-4 pt-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="Preview" className="w-44 aspect-[3/4] object-cover rounded-sm border border-gray-200" />

                {/* Photo check status */}
                {checking && (
                  <div className="w-full max-w-xs flex items-center gap-2 px-4 py-3 border border-gray-100 rounded-sm bg-gray-50">
                    <svg className="animate-spin w-3.5 h-3.5 text-gray-400 shrink-0" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                    </svg>
                    <p className="text-xs text-gray-500">Checking photo...</p>
                  </div>
                )}
                {!checking && photoOk === true && (
                  <div className="w-full max-w-xs flex items-center gap-2 px-4 py-3 border border-green-100 rounded-sm bg-green-50">
                    <span className="text-green-500 text-sm shrink-0">✓</span>
                    <p className="text-xs text-green-700 font-semibold">Photo looks good — ready to analyse</p>
                  </div>
                )}
                {!checking && photoOk === false && warning && (
                  <div className="w-full max-w-xs border border-amber-200 bg-amber-50 rounded-sm px-4 py-3 space-y-1">
                    <p className="text-xs font-black uppercase tracking-wide text-amber-700">Photo may not work well</p>
                    <p className="text-sm text-amber-800">{warning}</p>
                  </div>
                )}
                {error && (
                  <div className="w-full max-w-xs border border-red-200 bg-red-50 rounded-sm px-4 py-3 text-sm text-red-700">{error}</div>
                )}

                {/* Sex indicator */}
                <div className="w-full max-w-xs flex items-center justify-between px-4 py-2.5 border border-gray-100 rounded-sm bg-gray-50">
                  <span className="text-[10px] font-bold tracking-widest uppercase text-gray-400">Style Profile</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700">
                      {userSex === "male" ? "Male" : userSex === "female" ? "Female" : "Unspecified"}
                    </span>
                    <a href="/profile" className="text-[10px] text-gray-400 underline underline-offset-2 hover:text-gray-700 transition-colors">change</a>
                  </div>
                </div>

                <div className="flex gap-3 w-full max-w-xs">
                  <button
                    onClick={() => { setImage(null); setWarning(null); setPhotoOk(null); setStep("upload"); }}
                    className="flex-1 border border-gray-300 py-2.5 rounded-sm text-sm font-semibold text-gray-600 hover:border-gray-500 hover:text-gray-950 transition-colors"
                  >
                    ← Retake
                  </button>
                  <button
                    onClick={() => handleConfirm(photoOk === false)}
                    disabled={checking}
                    className="flex-1 bg-gray-950 text-white py-2.5 rounded-sm text-sm font-black tracking-wide hover:bg-gray-800 transition-colors disabled:opacity-40"
                  >
                    {checking ? "Checking..." : photoOk === false ? "Analyse Anyway →" : "Analyse →"}
                  </button>
                </div>
              </div>
            )}

            {/* Step 2 — Q&A (Pro only) */}
            {step === "qa" && (
              <div className="space-y-5">
                {/* Photo thumbnail */}
                {image && (
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt="Your photo" className="w-16 h-16 object-cover rounded-sm border border-gray-200 shrink-0" />
                    <button onClick={() => setStep("upload")} className="text-sm text-gray-600 hover:text-gray-950 font-semibold transition-colors">← Rescan</button>
                  </div>
                )}

                {/* Q&A fields — 2 columns */}
                <div className="grid grid-cols-2 gap-x-6 gap-y-5">
                  {(() => {
                    const S = userSex === "female" ? QA_SUGGESTIONS_FEMALE : QA_SUGGESTIONS_MALE;
                    return (<>
                      <QAField label="อยากลองทรงแบบไหน?" value={qa.desired_style} onChange={(v) => setQa(p => ({ ...p, desired_style: v }))} suggestions={S.desired_style} />
                      <QAField label="ผมตอนนี้สีอะไร?" value={qa.current_color} onChange={(v) => setQa(p => ({ ...p, current_color: v }))} suggestions={S.current_color} />
                      <QAField label="อยากเปลี่ยนสีผมไหม?" value={qa.target_color} onChange={(v) => setQa(p => ({ ...p, target_color: v }))} suggestions={S.target_color} />
                      <QAField label="ไลฟ์สไตล์คุณเป็นแบบไหน?" value={qa.lifestyle} onChange={(v) => setQa(p => ({ ...p, lifestyle: v }))} suggestions={S.lifestyle} />
                    </>);
                  })()}
                </div>

                {/* Bleach question — centered, outside grid */}
                <div className="flex flex-col items-center gap-2">
                  <p className="text-xs font-bold tracking-wide uppercase text-gray-700">เคยฟอกสีผมมาก่อนไหม?</p>
                  <div className="flex gap-2">
                    {["เคย", "ไม่เคย"].map((opt) => (
                      <button key={opt} onClick={() => setQa(p => ({ ...p, bleached_before: opt === "เคย" }))}
                        className={`px-5 py-2.5 rounded-sm text-sm font-bold border transition-colors ${
                          (qa.bleached_before ? "เคย" : "ไม่เคย") === opt
                            ? "bg-gray-950 text-white border-gray-950"
                            : "bg-white text-gray-700 border-gray-300 hover:border-gray-600"
                        }`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>

                {error && (
                  <div className="border border-red-200 bg-red-50 rounded-sm p-3 text-sm text-red-700">{error}</div>
                )}

                <button onClick={handleQASubmit}
                  className="w-full bg-gray-950 text-white py-4 rounded-sm font-black text-sm tracking-wide hover:bg-gray-800 active:scale-[0.99] transition-all">
                  Analyse My Hair →
                </button>
                <p className="text-center text-xs text-gray-500">All fields optional — skip any you like</p>
              </div>
            )}

            {/* Analyzing loader */}
            {step === "analyzing" && (
              <div className="flex flex-col items-center justify-center py-20 gap-6">
                <div className="relative w-16 h-16">
                  <svg className="animate-spin w-16 h-16 text-gray-200" viewBox="0 0 64 64" fill="none">
                    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="4"/>
                  </svg>
                  <svg className="animate-spin w-16 h-16 text-gray-950 absolute inset-0" viewBox="0 0 64 64" fill="none" style={{ animationDuration: "0.8s" }}>
                    <path d="M32 4a28 28 0 0 1 28 28" stroke="currentColor" strokeWidth="4" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="text-center space-y-1">
                  <p className="font-black text-gray-950 text-sm">{loadingMsg}</p>
                  <p className="text-gray-500 text-xs">Usually takes 30–60 seconds</p>
                </div>
              </div>
            )}

            {/* Step 3 — Result */}
            {step === "result" && cardImage && (
              <div className="space-y-4 flex flex-col items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={cardImage} alt="Hair Analysis Card" className="w-[75%] rounded-sm border border-gray-100" />
                {skippedWarning && (
                  <p className="text-[11px] text-gray-400 text-center w-[75%] leading-relaxed">
                    ⚠ Photo quality limited — result may vary.
                  </p>
                )}
                <div className="space-y-2 w-[75%]">
                  <a href={cardImage} download="hair-analysis.png"
                    className="w-full bg-gray-950 text-white py-4 rounded-sm font-black text-sm tracking-wide hover:bg-gray-800 transition-all flex items-center justify-center gap-2">
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                      <path d="M8 2v8M5 7l3 3 3-3M2 12h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Save Card
                  </a>
                  <button onClick={() => router.push("/booking")}
                    className="w-full border border-gray-300 py-3 rounded-sm text-sm font-semibold text-gray-800 hover:text-gray-950 hover:border-gray-500 transition-colors">
                    Book This Look →
                  </button>
                  <button onClick={() => { setStep("upload"); setCardImage(null); setAnalysis(null); setError(null); setWarning(null); setSkippedWarning(null); }}
                    className="w-full border border-gray-200 py-3 rounded-sm text-sm font-semibold text-gray-600 hover:text-gray-950 hover:border-gray-400 transition-colors">
                    ← Try Again
                  </button>
                </div>
              </div>
            )}

      </div>
    </div>
  );
}

// ── Q&A Field component ───────────────────────────────────────────
function QAField({ label, value, onChange, suggestions }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  suggestions: string[];
}) {
  return (
    <div>
      <p className="text-xs font-bold tracking-wide uppercase text-gray-700 mb-2">{label}</p>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type or pick below..."
        className="w-full border border-gray-200 rounded-sm px-3 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-gray-600 transition-colors"
      />
      <div className="flex flex-wrap gap-1.5 mt-2">
        {suggestions.map((s) => (
          <button key={s} onClick={() => onChange(s)}
            className={`text-xs px-3 py-1 rounded-full border transition-colors font-semibold ${
              value === s
                ? "bg-gray-950 text-white border-gray-950"
                : "border-gray-200 text-gray-600 hover:border-gray-500 hover:text-gray-900"
            }`}>
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
