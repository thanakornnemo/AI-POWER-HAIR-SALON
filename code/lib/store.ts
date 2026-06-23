// ── Analysis JSON (from /api/analyze) ──────────────────────────
export interface ColorOption {
  name: string;
  hex: string;
  tone: "warm" | "cool" | "neutral";
}

export interface AnalysisJSON {
  face_shape: string;
  skin_tone: string;
  personal_color: string;
  hair_texture: string;
  hair_density: string;
  hair_length_current: string;
  natural_hair_color: string;
  hairline_type: string;
  forehead_size: string;
  overall_vibe: string[];
  best_match: {
    name: string;
    match_score: number;
    fade_level: string;
    top_length_cm: number;
    maintenance: string;
    reason: string;
  };
  good_options: { name: string; match_score: number; reason: string }[];
  not_recommended: { name: string; reason: string }[];
  parting_recommendation: string;
  fringe_recommendation: string;
  length_options: {
    short_verdict: string;
    short_cm: string;
    medium_verdict: string;
    medium_cm: string;
    long_verdict: string;
    long_cm: string;
  };
  color: {
    recommended: ColorOption[];
    avoid: { name: string; reason: string }[];
    formula: string | null;
    developer_vol: number | null;
    bleach_required: boolean | null;
  };
  celebrity_ref: {
    name: string;
    similarity_reason: string;
  } | null;
  cutting_guide?: {
    overview: string;
    section_prep: string;
    sides: string;
    back: string;
    top: string;
    fringe: string;
    blending: string;
    texture_detail: string;
    finishing: string;
    tools: string[];
    color_application: string;
    estimated_time: string;
    common_mistakes: string;
  } | null;
  cutting_guide_th?: {
    overview: string;
    section_prep: string;
    sides: string;
    back: string;
    top: string;
    fringe: string;
    blending: string;
    texture_detail: string;
    finishing: string;
    color_application: string;
    estimated_time: string;
    common_mistakes: string;
  } | null;
  summary: string;
  care_tips: string[];
  care_tips_th?: string[];
}

// ── Tryon/Analysis session result ───────────────────────────────
export interface TryonResult {
  originalImage?: string;
  generatedImage?: string;
  selectedStyle: string;
  styleIndex: number;
  analysis?: AnalysisJSON;
  isPro?: boolean;
  qaAnswers?: {
    desired_style?: string;
    current_color?: string;
    target_color?: string;
    lifestyle?: string;
    bleached_before?: boolean;
  } | null;
}

// ── Unified history record ────────────────────────────────────────
export type HistoryType = "ai-free" | "ai-pro" | "booking";

export interface HistoryRecord {
  id: string;
  timestamp: string;
  type: HistoryType;
  // AI scan fields
  bestMatch?: string;
  faceShape?: string;
  personalColor?: string;
  skinTone?: string;
  hairTexture?: string;
  hairDensity?: string;
  maintenance?: string;
  summary?: string;
  topColors?: string[];
  goodOptions?: string[];
  notRecommended?: string[];
  careTips?: string[];
  celebrityRef?: string;
  cuttingGuide?: AnalysisJSON["cutting_guide"];
  cuttingGuideTh?: AnalysisJSON["cutting_guide_th"];
  careTipsTh?: string[];
  qaAnswers?: TryonResult["qaAnswers"];
  colorFormula?: string;
  colorDeveloper?: number | null;
  colorBleach?: boolean | null;
  // Booking fields
  stylistName?: string;
  bookingDate?: string;
  bookingTime?: string;
  estimatedPrice?: number;
}

// legacy alias kept for migration safety
export type ScanRecord = HistoryRecord;

// ── Visit history record ─────────────────────────────────────────
export interface VisitRecord {
  id: string;
  date: string;
  styleName: string;
  styleIndex: number;
  stylistName: string;
  estimatedPrice: number;
  paidDeposit: boolean;
  originalImage: string;
  generatedImage: string;
  analysis?: AnalysisJSON;
}

// ── User profile ─────────────────────────────────────────────────
export type UserSex = "male" | "female";

export interface UserProfile {
  sex: UserSex | null;
}

// ── Storage keys ─────────────────────────────────────────────────
const TRYON_KEY    = "hair_salon_tryon";
const HISTORY_KEY  = "hair_salon_history";
const UNIFIED_KEY  = "hair_salon_unified";
const PRO_KEY      = "hair_salon_pro";
const PROFILE_KEY  = "hair_salon_profile";

// ── Tryon result (current session) ──────────────────────────────
export function saveTryonResult(result: TryonResult) {
  if (typeof window !== "undefined")
    localStorage.setItem(TRYON_KEY, JSON.stringify(result));
}
export function loadTryonResult(): TryonResult | null {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(TRYON_KEY);
    if (raw) return JSON.parse(raw);
  }
  return null;
}
export function clearTryonResult() {
  if (typeof window !== "undefined") localStorage.removeItem(TRYON_KEY);
}

// ── Pro Mode ──────────────────────────────────────────────────────
export function isProMode(): boolean {
  if (typeof window !== "undefined")
    return localStorage.getItem(PRO_KEY) === "true";
  return false;
}
export function activateProMode() {
  if (typeof window !== "undefined") localStorage.setItem(PRO_KEY, "true");
}
export function deactivateProMode() {
  if (typeof window !== "undefined") localStorage.removeItem(PRO_KEY);
}

// ── User profile ─────────────────────────────────────────────────
export function loadUserProfile(): UserProfile | null {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(PROFILE_KEY);
    if (raw) return JSON.parse(raw);
  }
  return null;
}
export function saveUserProfile(profile: UserProfile) {
  if (typeof window !== "undefined")
    localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// ── Visit history ─────────────────────────────────────────────────
export function loadHistory(): VisitRecord[] {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) return JSON.parse(raw);
  }
  return [];
}
export function saveVisit(visit: VisitRecord) {
  if (typeof window !== "undefined") {
    const history = loadHistory();
    history.unshift(visit);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  }
}

// ── Unified history ───────────────────────────────────────────────
export function loadUnifiedHistory(): HistoryRecord[] {
  if (typeof window !== "undefined") {
    const raw = localStorage.getItem(UNIFIED_KEY);
    if (raw) return JSON.parse(raw);
  }
  return [];
}
export function saveHistoryRecord(record: HistoryRecord) {
  if (typeof window !== "undefined") {
    const list = loadUnifiedHistory();
    list.unshift(record);
    localStorage.setItem(UNIFIED_KEY, JSON.stringify(list));
  }
}
export function deleteHistoryRecord(id: string) {
  if (typeof window !== "undefined") {
    const list = loadUnifiedHistory().filter((r) => r.id !== id);
    localStorage.setItem(UNIFIED_KEY, JSON.stringify(list));
  }
}
// legacy aliases
export const loadScans = loadUnifiedHistory;
export const saveScan = saveHistoryRecord;
export const deleteScan = deleteHistoryRecord;
