# AI Hair Salon — Bangkok

A mobile-first AI-powered hair consultation web app. Users upload a photo, get a full hair and face analysis, receive a generated visual result card, view a technical stylist brief, and can book an appointment — all in one seamless flow.

---

## Overview

The app combines two AI models:
- **GPT-4o (vision)** — analyzes face shape, skin tone, personal color season, hair texture/density, and recommends hairstyles from a curated list
- **GPT-Image-2** — generates a 1024×1792px infographic card showing the analysis results visually

All history is stored client-side in `localStorage` (text only, no images stored).

---

## Tiers

| Feature | Free | Pro |
|---|---|---|
| Photo check | ✓ | ✓ |
| AI Hair & Face Analysis | Basic | Full |
| Pro Q&A (style preferences, lifestyle) | — | ✓ |
| Hair color formula + developer vol | — | ✓ |
| Celebrity reference | — | ✓ |
| Care tips in profile | — | ✓ |
| Result card watermark | "FREE" diagonal | Clean |
| Booking discount | — | 50 THB off every visit |
| Profile history detail | Basic | Full (6 stats + care tips + celeb ref) |

---

## Full User Flow

### Step 01 — Scan (Upload)
1. User uploads a portrait photo via drag-and-drop or file picker
2. **Immediately on upload**, app calls `POST /api/analyze` with `checkOnly: true`
3. Photo check runs (GPT-4o, `max_tokens: 100`, `temperature: 0`) and returns `{ unsuitable: boolean, reason: string }`
4. Preview screen shows the photo + check result:
   - Spinner while checking
   - ✓ green banner → photo is good
   - ⚠ amber banner + reason → photo has issues (hat, blurry, face obscured, etc.)
5. Two buttons appear:
   - **← Retake** — goes back to upload
   - **Analyse → / Analyse Anyway →** — continues regardless (passes `photoWarning` flag forward)

### Step 02 — Style Q&A (Pro only)
Pro users see a form before analysis:
- Desired style (text + suggestion chips)
- Current hair color
- Target color
- Lifestyle
- Whether they've bleached before (toggle)

All fields are optional. This context is passed to GPT-4o to personalize recommendations.

### Analyzing (loader)
App calls `POST /api/analyze` (full analysis, `max_tokens: 2000`, `temperature: 0.7`) then `POST /api/card` sequentially. Loading messages update between steps ("Analysing your face and hair..." → "Generating your hair analysis card...").

### Step 03 — Result
- AI-generated 1024×1792px card image displayed at 75% width
- If photo warning was skipped: small note "⚠ Photo quality limited — result may vary." shown below card
- Buttons: **Save Card** (download PNG) · **Book This Look →** · **← Try Again**
- Result + analysis JSON saved to `localStorage` for Brief and Booking pages to read

---

## Pages

### `/` — Landing
- Feature overview (4 feature cards)
- Pro mode activation panel (scroll-to on `?highlight=pro`)
- Activating Pro sets `hair_salon_pro=true` in localStorage
- Pro badge shown in nav once active

### `/tryon` — Main Flow
- States: `upload → preview → qa (Pro) → analyzing → result`
- State machine managed with a single `step` string, no router navigation between steps
- `handleImageSelected` — async, triggers photo check immediately
- `handleConfirm(forceSkip)` — if `forceSkip=true` (Analyse Anyway), saves `warning` text synchronously before calling `runAnalysis` (avoids React async state timing issue)
- `runAnalysis(img, pro, qaAnswers, skipCheck, photoWarn)` — 5-arg function, calls analyze then card APIs in sequence

### `/brief` — Technical Brief
- Reads `TryonResult` from localStorage on mount
- Shows the generated card image + download button
- Pro users also see a text technical brief: cut measurements, color formula, celebrity reference, care tips

### `/booking` — Book a Stylist
- Reads last `TryonResult` from localStorage to prefill style name and add-on pricing
- Stylist list from `components/StylistCard.tsx` (static data)
- Time slot picker from `components/TimeSlotPicker.tsx`
- On confirm: saves `HistoryRecord` with `type: "booking"` to unified history
- Price = stylist base price + style add-on − 50 THB (Pro only)

### `/profile` — History
- Loads `HistoryRecord[]` from localStorage
- Shows unified list: AI Free / AI Pro / Booking items with type badge
- Click any item → modal popup (`HistoryModal` component)
- AI records show: best match, face shape, personal color (+ skin tone, hair texture, maintenance for Pro), also suits, top colors, summary, care tips (Pro), celebrity ref (Pro), not recommended (Pro)
- Booking records show: stylist, date, time, estimated price
- Delete button removes from localStorage
- Escape key closes modal

---

## API Routes

### `POST /api/analyze`
**Request:**
```json
{
  "image": "base64string",
  "checkOnly": true,
  "isPro": false,
  "additionalContext": { ... },
  "skipCheck": false
}
```

**`checkOnly: true`** — Fast photo validation only:
- Uses short prompt, `max_tokens: 100`, `temperature: 0`
- Returns `{ unsuitable: true, reason: "..." }` or `{ unsuitable: false }`
- Flags: headwear, no hair/scalp visible, face obscured, poor quality, not a person, uncertain

**`checkOnly: false`** — Full analysis:
- Uses full prompt with `ANALYSIS_SCHEMA` JSON schema, `max_tokens: 2000`, `temperature: 0.7`
- Hairstyle names constrained to `HAIRSTYLE_LIST` (30 male + 21 female styles)
- Pro adds: `color.formula`, `color.developer_vol`, `color.bleach_required`, `celebrity_ref`
- Returns `{ analysis: AnalysisJSON }`

### `POST /api/card`
**Request:**
```json
{
  "image": "base64string",
  "analysis": { ...AnalysisJSON },
  "isPro": false,
  "photoWarning": true
}
```
- Constructs detailed infographic prompt from analysis values
- Calls `openai.images.edit` with `gpt-image-2`, size `1024x1792`, quality `high`
- Returns `{ image: "data:image/png;base64,..." }`
- Logs: saves `{timestamp}.json` (analysis), `{timestamp}.prompt.txt` (prompt), `{timestamp}.card.png` (result) to `/logs`

---

## Data & State

### localStorage keys
| Key | Type | Purpose |
|---|---|---|
| `hair_salon_tryon` | `TryonResult` | Current session result (original image, generated card, analysis JSON) |
| `hair_salon_unified` | `HistoryRecord[]` | All AI scans + bookings combined (text-only, newest first) |
| `hair_salon_pro` | `"true"` | Pro mode flag |
| `hair_salon_history` | `VisitRecord[]` | Legacy booking history (kept for migration) |

### Key types (`lib/store.ts`)
- **`AnalysisJSON`** — full GPT-4o output: face shape, skin tone, personal color, hair texture/density, best match, good options, not recommended, length options, color recommendations, celebrity ref, summary, care tips
- **`HistoryRecord`** — unified record for both AI scans and bookings. `type: "ai-free" | "ai-pro" | "booking"` determines which fields are populated
- **`TryonResult`** — current session: original image (base64), generated card image (base64), selected style name, analysis JSON, isPro flag

### Inter-page data flow
```
/tryon
  → saveTryonResult()     → localStorage[hair_salon_tryon]
  → saveScan()            → localStorage[hair_salon_unified]

/brief
  ← loadTryonResult()     ← localStorage[hair_salon_tryon]

/booking
  ← loadTryonResult()     ← localStorage[hair_salon_tryon]  (style name + pricing)
  → saveHistoryRecord()   → localStorage[hair_salon_unified]

/profile
  ← loadUnifiedHistory()  ← localStorage[hair_salon_unified]
```

No global state manager — all cross-page state flows through localStorage.

---

## AI Prompt Design

### Photo Check Prompt
Runs at `temperature: 0` for determinism. Explicitly flags any headwear as unsuitable even when face is visible. "UNCERTAIN → unsuitable: true" as a safe default. Sunglasses alone are NOT flagged.

### Analysis Prompt
- Forces all output in English
- Constrains hairstyle names to a curated list of 30 male + 21 female styles (popular in Thailand/Korea)
- Requires exactly 3 `good_options`, 3 `not_recommended`, 4–5 color recommendations
- Pro mode adds lifestyle context from Q&A and fills formula/developer/bleach fields

### Card Generation Prompt
- 7 blocks: Hair & Face Analysis · Best Hairstyles · Not Recommended · Hair Length · Parting & Fringe · Hair Color · Best Look
- Best picks (length, parting, color) are resolved by the route handler before being hardcoded into the prompt — avoids AI interpreting relative verdicts
- FREE watermark added for non-Pro users
- `photoWarning: true` adds warning line in footer

---

## File Structure

```
app/
  page.tsx                  Landing, Pro activation
  tryon/page.tsx            Main scan flow (all 5 steps)
  brief/page.tsx            Technical brief view
  booking/page.tsx          Booking flow
  profile/page.tsx          Unified history + HistoryModal
  api/
    analyze/route.ts        Photo check + GPT-4o analysis
    card/route.ts           GPT-Image-2 card generation

components/
  ImageUpload.tsx           Drag-and-drop photo uploader
  Nav.tsx                   Bottom nav (mobile) / top nav (desktop)
  StylistCard.tsx           Stylist list + static data
  TimeSlotPicker.tsx        Date/time slot selector

lib/
  store.ts                  All localStorage helpers + TypeScript types
  hairstyles.ts             Static hairstyle catalogue (for booking add-ons)

logs/                       Auto-saved per request: .json · .prompt.txt · .card.png
```

---

## Setup

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # Production build + type check
npm run lint       # ESLint
```

Create `.env.local`:
```
OPENAI_API_KEY=sk-...
```

Node.js >= 18.17.0 required.
