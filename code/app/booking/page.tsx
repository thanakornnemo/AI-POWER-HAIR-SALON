"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { StylistCard, STYLISTS } from "@/components/StylistCard";
import TimeSlotPicker from "@/components/TimeSlotPicker";
import { loadTryonResult, isProMode, saveHistoryRecord } from "@/lib/store";
import { HAIRSTYLES } from "@/lib/hairstyles";

const DEPOSIT = 50;

export default function BookingPage() {
  const [selectedStylistId, setSelectedStylistId] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [styleName, setStyleName] = useState("");
  const [styleIndex, setStyleIndex] = useState(0);
  const [styleAddOn, setStyleAddOn] = useState(0);
  const [hasPro, setHasPro] = useState(false);

  useEffect(() => {
    const r = loadTryonResult();
    if (r) {
      setStyleName(r.selectedStyle);
      setStyleIndex(r.styleIndex);
      const h = HAIRSTYLES.find((s) => s.id === r.styleIndex);
      if (h) setStyleAddOn(h.serviceAddOn);
    }
    setHasPro(isProMode());
  }, []);

  const selectedStylist = STYLISTS.find((s) => s.id === selectedStylistId);
  const canConfirm = selectedStylistId && selectedDate && selectedTime;
  const baseEstimate = selectedStylist ? selectedStylist.basePrice + styleAddOn : null;
  const finalEstimate = baseEstimate ? (hasPro ? baseEstimate - DEPOSIT : baseEstimate) : null;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const days = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]}`;
  };

  const handleConfirm = () => {
    if (!selectedStylist || !selectedDate || !selectedTime) return;
    saveHistoryRecord({
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      type: "booking",
      stylistName: selectedStylist.name,
      bookingDate: selectedDate,
      bookingTime: selectedTime,
      estimatedPrice: finalEstimate ?? 0,
    });
    setConfirmed(true);
  };

  // ── Confirmed ──
  if (confirmed && selectedStylist && selectedDate && selectedTime) {
    return (
      <div className="min-h-screen bg-white">
        <div className="border-b border-gray-100 px-6 py-10 md:py-14">
          <div className="max-w-3xl mx-auto flex items-center gap-4">
            <div className="w-10 h-10 rounded-sm bg-gray-950 flex items-center justify-center shrink-0">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                <path d="M5 13l4 4L19 7" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-700 mb-0.5">Confirmed</p>
              <h2 className="text-2xl md:text-3xl font-black text-gray-950 tracking-tight">Booking Confirmed</h2>
            </div>
          </div>
        </div>

        <div className="max-w-3xl mx-auto px-6 py-8 space-y-5">
          <div className="border border-gray-200 rounded-sm divide-y divide-gray-100">
            <div className="px-5 py-4">
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-800 mb-3">Appointment</p>
              <Row label="Stylist" value={selectedStylist.name} />
              <Row label="Date & Time" value={`${formatDate(selectedDate)} · ${selectedTime}`} />
              {styleName && <Row label="Style" value={styleName} />}
            </div>
            <div className="px-5 py-4 space-y-1.5">
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-800 mb-3">Price Estimate</p>
              <Row label="Haircut & Styling" value={`~${selectedStylist.basePrice} THB`} dim />
              {styleAddOn > 0 && <Row label="Style add-on" value={`~+${styleAddOn} THB`} dim />}
              {hasPro && <Row label="Pro discount" value={`−${DEPOSIT} THB`} bold />}
              <div className="flex justify-between pt-2 mt-1 border-t border-gray-100">
                <span className="text-sm font-black text-gray-950">Estimated Total</span>
                <span className="text-lg font-black text-gray-950">~{finalEstimate} THB</span>
              </div>
              <p className="text-[11px] text-gray-800">Final price confirmed by your stylist in-salon.</p>
            </div>
          </div>

          <p className="text-sm text-gray-900 border border-gray-100 rounded-sm px-4 py-3 bg-gray-50">
            💬 LINE reminder will be sent 24 hours before your appointment.
          </p>
          <Link href="/" className="block w-full bg-gray-950 text-white text-center py-4 rounded-sm font-black text-sm tracking-wide hover:bg-gray-800 transition-colors">
            Back to Home
          </Link>
        </div>
      </div>
    );
  }

  // ── Booking form ──
  return (
    <div className="min-h-screen bg-white">
      {/* Hero bar */}
      <div className="border-b border-gray-100 px-6 py-8 md:py-10">
        <div className="max-w-3xl mx-auto">
          <p className="text-[11px] font-bold tracking-[0.3em] uppercase text-gray-700 mb-2">(Booking)</p>
          <h1 className="text-3xl md:text-4xl font-black text-gray-950 tracking-tight">Book Appointment</h1>
          {styleName && <p className="text-gray-700 text-sm mt-1">Style: {styleName}</p>}
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-8 md:py-10 space-y-10">
        {/* Pro / no-pro */}
        {hasPro ? (
          <div className="flex items-center justify-between border border-gray-200 rounded-sm px-4 py-3 bg-gray-50">
            <p className="text-sm font-semibold text-gray-900">Pro Mode — <span className="text-gray-900 font-normal">50 THB off applied to estimate</span></p>
            <span className="text-[10px] font-black tracking-widest text-gray-800 uppercase">Active</span>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 border border-gray-200 rounded-sm px-4 py-3">
            <p className="text-gray-800 text-sm flex-1 leading-relaxed">
              Booking at full price. <Link href="/" className="text-gray-900 font-semibold underline underline-offset-2">Activate Pro on Home</Link> to save 50 THB.
            </p>
          </div>
        )}

        {/* Stylist */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-800">Choose Stylist</p>
          <div className="space-y-2">
            {STYLISTS.map((s) => (
              <StylistCard key={s.id} stylist={s} selected={selectedStylistId === s.id} onSelect={() => setSelectedStylistId(s.id)} />
            ))}
          </div>
        </div>

        {/* Date + time */}
        <div className="space-y-3">
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-800">Date & Time</p>
          <TimeSlotPicker
            selectedDate={selectedDate} selectedTime={selectedTime}
            onDateSelect={setSelectedDate} onTimeSelect={setSelectedTime}
          />
        </div>

        {/* Price + confirm */}
        {canConfirm && selectedStylist && baseEstimate ? (
          <div className="space-y-4">
            <div className="border border-gray-200 rounded-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-gray-800 mb-3">Price Estimate</p>
                <Row label="Haircut & Styling" value={`~${selectedStylist.basePrice} THB`} dim />
                {styleAddOn > 0 && <Row label="Style add-on" value={`~+${styleAddOn} THB`} dim />}
                {hasPro && <Row label="Pro discount" value={`−${DEPOSIT} THB`} bold />}
              </div>
              <div className="px-5 py-4 flex justify-between items-center">
                <span className="text-sm font-black text-gray-950">Estimated Total</span>
                <div className="text-right">
                  {hasPro && <p className="text-gray-600 text-xs line-through leading-none mb-0.5">{baseEstimate} THB</p>}
                  <p className="text-2xl font-black text-gray-950 leading-none">~{finalEstimate} THB</p>
                </div>
              </div>
              <p className="px-5 pb-3 text-[11px] text-gray-800">Final price confirmed by your stylist in-salon.</p>
            </div>
            <button onClick={handleConfirm}
              className="w-full bg-gray-950 text-white py-4 rounded-sm font-black text-sm tracking-wide hover:bg-gray-800 active:scale-[0.99] transition-all">
              {hasPro ? `Confirm Booking · ~${finalEstimate} THB (Pro)` : `Confirm Booking · ~${finalEstimate} THB`}
            </button>
            <p className="text-center text-[11px] text-gray-800">No payment now — settle at the salon</p>
          </div>
        ) : (
          <p className="text-center text-sm text-gray-800 py-2">
            {!selectedStylistId ? "Select a stylist to continue" : !selectedDate ? "Pick a date" : "Pick a time slot"}
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, dim, bold }: { label: string; value: string; dim?: boolean; bold?: boolean }) {
  return (
    <div className="flex justify-between py-1">
      <span className="text-sm text-gray-900">{label}</span>
      <span className={`text-sm ${bold ? "font-black text-gray-950" : dim ? "font-medium text-gray-800" : "font-semibold text-gray-900"}`}>{value}</span>
    </div>
  );
}

