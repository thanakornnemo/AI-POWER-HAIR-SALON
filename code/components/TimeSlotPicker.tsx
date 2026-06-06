"use client";

const TIME_SLOTS = ["10:00", "11:00", "13:00", "14:00", "15:00", "16:00", "17:00"];

function getNext7Days() {
  const days: { label: string; date: number; value: string }[] = [];
  const today = new Date();
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 1; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push({ label: dayNames[d.getDay()], date: d.getDate(), value: d.toISOString().split("T")[0] });
  }
  return days;
}

interface Props {
  selectedDate: string | null;
  selectedTime: string | null;
  onDateSelect: (date: string) => void;
  onTimeSelect: (time: string) => void;
}

export default function TimeSlotPicker({ selectedDate, selectedTime, onDateSelect, onTimeSelect }: Props) {
  const days = getNext7Days();
  return (
    <div className="space-y-3">
      <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
        {days.map((d) => (
          <button key={d.value} onClick={() => onDateSelect(d.value)}
            className={`shrink-0 w-12 flex flex-col items-center py-2.5 rounded-sm border text-xs font-bold transition-all ${
              selectedDate === d.value
                ? "bg-black text-white border-black"
                : "border-gray-200 bg-white text-gray-900 hover:border-gray-400 hover:text-black"
            }`}>
            <span className={`text-[9px] tracking-wide mb-1 ${selectedDate === d.value ? "text-white/70" : "text-gray-700"}`}>{d.label}</span>
            <span className="text-sm font-black">{d.date}</span>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-2">
        {TIME_SLOTS.map((t) => (
          <button key={t} onClick={() => onTimeSelect(t)}
            className={`py-2.5 rounded-sm border text-xs font-bold tracking-wide transition-all ${
              selectedTime === t
                ? "bg-black text-white border-black"
                : "border-gray-200 bg-white text-gray-900 hover:border-gray-400 hover:text-black"
            }`}>
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}

