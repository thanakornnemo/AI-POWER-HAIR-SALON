"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isProMode, deactivateProMode, loadUnifiedHistory, deleteHistoryRecord, HistoryRecord } from "@/lib/store";

const TYPE_LABEL: Record<string, string> = { "ai-free": "AI Free", "ai-pro": "AI Pro", "booking": "Booking" };

function HistoryModal({ record, onClose, onDelete }: { record: HistoryRecord; onClose: () => void; onDelete: (id: string) => void }) {
  const isAI = record.type !== "booking";
  const dateStr = new Date(record.timestamp).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-0 sm:px-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100">
          <div>
            <p className="font-black text-gray-950 text-base">{isAI ? record.bestMatch : `Booked · ${record.stylistName}`}</p>
            <p className="text-gray-500 text-xs mt-0.5">{dateStr}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-black tracking-widest uppercase border border-gray-300 px-1.5 py-0.5 rounded-sm text-gray-600">{TYPE_LABEL[record.type]}</span>
            <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 transition-colors text-gray-600 text-sm">✕</button>
          </div>
        </div>

        {/* Body */}
        <div className="px-5 py-5 space-y-4">
          {isAI ? (
            <>
              {/* Stats grid — Pro gets more fields */}
              <div className={`grid gap-2 ${record.type === "ai-pro" ? "grid-cols-3" : "grid-cols-3"}`}>
                {([
                  ["Best Match", record.bestMatch],
                  ["Face Shape", record.faceShape],
                  ["Personal Color", record.personalColor],
                  ...(record.type === "ai-pro" ? [
                    ["Skin Tone", record.skinTone],
                    ["Hair Texture", record.hairTexture],
                    ["Maintenance", record.maintenance],
                  ] : []),
                ] as [string, string][]).map(([k, v]) => (
                  <div key={k} className="bg-gray-50 border border-gray-100 rounded-lg px-3 py-2.5">
                    <p className="text-[9px] text-gray-400 uppercase tracking-wide font-bold mb-1">{k}</p>
                    <p className="text-gray-950 text-xs font-bold capitalize">{v}</p>
                  </div>
                ))}
              </div>

              {/* Celebrity ref — Pro only */}
              {record.type === "ai-pro" && record.celebrityRef && (
                <div className="flex items-center gap-2 border border-gray-100 rounded-lg px-3 py-2.5 bg-gray-50">
                  <span className="text-base">★</span>
                  <div>
                    <p className="text-[9px] text-gray-400 uppercase tracking-wide font-bold">Celebrity Reference</p>
                    <p className="text-xs text-gray-950 font-bold">{record.celebrityRef}</p>
                  </div>
                </div>
              )}

              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-wide font-bold mb-2">Also Suits</p>
                <div className="flex flex-wrap gap-1.5">
                  {record.goodOptions?.map((s) => <span key={s} className="text-xs border border-gray-200 rounded-full px-3 py-1 text-gray-700">{s}</span>)}
                </div>
              </div>

              {/* Not recommended — Pro only */}
              {record.type === "ai-pro" && record.notRecommended && record.notRecommended.length > 0 && (
                <div>
                  <p className="text-[9px] text-gray-400 uppercase tracking-wide font-bold mb-2">Not Recommended</p>
                  <div className="flex flex-wrap gap-1.5">
                    {record.notRecommended.map((s) => <span key={s} className="text-xs border border-red-100 text-red-400 rounded-full px-3 py-1">{s}</span>)}
                  </div>
                </div>
              )}

              <div>
                <p className="text-[9px] text-gray-400 uppercase tracking-wide font-bold mb-2">Top Colors</p>
                <div className="flex flex-wrap gap-1.5">
                  {record.topColors?.map((c) => <span key={c} className="text-xs border border-gray-200 rounded-full px-3 py-1 text-gray-700">{c}</span>)}
                </div>
              </div>

              {record.summary && <p className="text-xs text-gray-600 leading-relaxed italic">{record.summary}{record.summary.length >= 120 ? "…" : ""}</p>}

              {/* Care tips — Pro only */}
              {record.type === "ai-pro" && record.careTips && record.careTips.length > 0 && (
                <div>
                  <p className="text-[9px] text-gray-400 uppercase tracking-wide font-bold mb-2">Care Tips</p>
                  <ul className="space-y-1">
                    {record.careTips.map((t) => <li key={t} className="text-xs text-gray-600 flex gap-2"><span className="text-gray-300 shrink-0">—</span>{t}</li>)}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="space-y-2">
              {([["Stylist", record.stylistName], ["Date", record.bookingDate], ["Time", record.bookingTime], ["Estimated Price", record.estimatedPrice ? `~${record.estimatedPrice} THB` : "-"]] as [string,string][]).map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-xs text-gray-500 font-bold uppercase tracking-wide">{k}</span>
                  <span className="text-xs text-gray-950 font-bold">{v}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-6 flex gap-2">
          <button onClick={onClose}
            className="flex-1 border border-gray-900 text-gray-900 py-3 rounded-lg text-sm font-black hover:bg-gray-950 hover:text-white transition-colors">
            Close
          </button>
          <button onClick={() => { onDelete(record.id); onClose(); }}
            className="border border-gray-200 text-gray-400 text-sm font-bold py-3 px-4 rounded-lg hover:border-red-300 hover:text-red-500 transition-colors">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [pro, setPro] = useState(false);
  const [selected, setSelected] = useState<HistoryRecord | null>(null);

  useEffect(() => {
    setRecords(loadUnifiedHistory());
    setPro(isProMode());
  }, []);

  const handleCancelPro = () => {
    deactivateProMode();
    setPro(false);
  };

  const handleDelete = (id: string) => {
    deleteHistoryRecord(id);
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} · ${String(d.getHours()).padStart(2,"0")}:${String(d.getMinutes()).padStart(2,"0")}`;
  };

  // close modal on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setSelected(null); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      {selected && (
        <HistoryModal record={selected} onClose={() => setSelected(null)} onDelete={handleDelete} />
      )}
      <div className="border-b border-gray-100 px-6 py-8 md:py-10">
        <div className="max-w-3xl mx-auto flex items-end justify-between">
          <div>
            <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-gray-700 mb-2">(Profile)</p>
            <h1 className="text-3xl md:text-4xl font-black text-gray-950 tracking-tight">My Profile</h1>
          </div>
          <span className={`text-xs font-black tracking-widest uppercase border px-3 py-1.5 rounded-sm mb-0.5 ${
            pro ? "border-gray-900 text-gray-950" : "border-gray-300 text-gray-600"
          }`}>
            {pro ? "Pro" : "Free"}
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 md:py-10 space-y-10">

        {pro ? (
          <div className="border border-gray-900 rounded-sm p-5">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4">
              <div className="flex-1">
                <p className="font-black text-gray-950 text-base mb-1">Pro Mode Active</p>
                <p className="text-gray-700 text-sm">Full AI · Technical Brief · <strong className="text-gray-950">50 THB off</strong> every visit</p>
              </div>
              <button onClick={handleCancelPro}
                className="shrink-0 border border-gray-300 text-gray-600 text-xs font-bold tracking-widest uppercase px-4 py-2 rounded-sm hover:border-gray-900 hover:text-gray-950 transition-colors self-start sm:self-auto">
                Cancel Pro
              </button>
            </div>
          </div>
        ) : (
          <div className="border border-gray-200 rounded-sm px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1">
              <p className="font-black text-gray-950 text-base mb-1">Free Tier</p>
              <p className="text-gray-900 text-sm">Upgrade to Pro for full AI access and 50 THB off every visit.</p>
            </div>
            <Link href="/"
              className="shrink-0 border border-gray-900 text-gray-900 text-xs font-black tracking-widest uppercase px-4 py-2 rounded-sm hover:bg-gray-950 hover:text-white transition-colors self-start sm:self-auto">
              Upgrade
            </Link>
          </div>
        )}

        <div className="space-y-4">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-800">
            History ({records.length})
          </p>

          {records.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-gray-200 rounded-sm space-y-4">
              <p className="text-5xl text-gray-100">✦</p>
              <p className="text-gray-800 text-sm">No activity yet</p>
              <Link href="/tryon"
                className="inline-block border border-gray-900 text-gray-900 text-sm font-bold px-6 py-2.5 rounded-sm hover:bg-gray-950 hover:text-white transition-colors">
                Start Your First Scan →
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 border border-gray-200 rounded-sm overflow-hidden">
              {records.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelected(r)}
                  className="w-full flex items-center gap-4 px-4 py-4 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-sm bg-gray-100 flex items-center justify-center shrink-0 text-base">
                    {r.type === "booking" ? "📅" : "✦"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-950 font-bold text-sm truncate">
                      {r.type === "booking" ? `${r.stylistName} · ${r.bookingTime}` : r.bestMatch}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">{formatDate(r.timestamp)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9px] font-black tracking-widest uppercase border border-gray-200 px-1.5 py-0.5 rounded-sm text-gray-500">
                      {TYPE_LABEL[r.type]}
                    </span>
                    <span className="text-gray-400 text-xs">›</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {records.length > 0 && (
          <div className="flex gap-3">
            <Link href="/tryon"
              className="flex-1 border border-gray-900 text-gray-900 py-4 rounded-sm font-black text-sm text-center hover:bg-gray-950 hover:text-white transition-colors">
              + New Scan
            </Link>
            <Link href="/booking"
              className="flex-1 border border-gray-200 text-gray-700 py-4 rounded-sm font-black text-sm text-center hover:border-gray-900 hover:text-gray-950 transition-colors">
              Book →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
