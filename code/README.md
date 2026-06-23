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
| Cutting guide (EN + TH) | — | ✓ |
| Care tips in profile | Basic | Full (EN + TH) |
| Result card watermark | "FREE" diagonal | Gold "PRO" diagonal |
| Booking discount | — | 50 THB off every visit |
| Profile history detail | Basic | Full (6 stats + care tips + celeb ref + cutting guide) |

---

## Full User Flow

```
Upload photo
    │
    ▼
POST /api/analyze (checkOnly: true)  ←── Photo check: GPT-4o, max_tokens:100
    │
    ├── unsuitable: true  ──► Preview shows ⚠ amber banner + reason
    │                              ↓
    │                    [← Retake] or [Analyse Anyway →]
    │
    └── unsuitable: false ──► Preview shows ✓ green banner
                                   ↓
                          [← Retake] or [Analyse →]
                                   ↓
                     (Pro only) Style Q&A form
                                   ↓
                    POST /api/analyze (full analysis)
                    POST /api/card (infographic)
                                   ↓
                         Result card displayed
                    [Save Card] [Book This Look →] [← Try Again]
                                   ↓
                        /brief  →  /booking  →  /profile
```

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
App calls `POST /api/analyze` (full analysis, `max_tokens: 4000`, `temperature: 0.7`) then `POST /api/card` sequentially. Loading messages update between steps ("Analysing your face and hair..." → "Generating your hair analysis card...").

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
- Pro users also see a text technical brief: cutting guide (EN + TH), color formula, celebrity reference, care tips (EN + TH)

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
- AI records show: best match, face shape, personal color (+ skin tone, hair texture, maintenance for Pro), also suits, top colors, summary, care tips (Pro), celebrity ref (Pro), cutting guide (Pro), not recommended (Pro)
- Booking records show: stylist, date, time, estimated price
- Delete button removes from localStorage
- Escape key closes modal

---

## API Routes

### `POST /api/analyze`

**Request:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "checkOnly": false,
  "isPro": false,
  "sex": "male",
  "additionalContext": {
    "desired_style": "Two Block",
    "current_color": "Black",
    "target_color": "Ash Brown",
    "lifestyle": "office",
    "bleached_before": false
  },
  "skipCheck": false
}
```

**Case A — `checkOnly: true`** (photo validation only):
- GPT-4o with short prompt, `max_tokens: 100`, `temperature: 0`
- Flags unsuitable if: headwear present, no hair/scalp visible, face obscured, poor quality, not a person, or uncertain
- Sunglasses alone are NOT flagged

```json
// Unsuitable response
{ "unsuitable": true, "reason": "Subject is wearing a cap — headwear is not permitted." }

// Suitable response
{ "unsuitable": false }
```

**Case B — `checkOnly: false`** (full analysis):
- GPT-4o with full prompt + `ANALYSIS_SCHEMA`, `max_tokens: 4000`, `temperature: 0.7`
- Hairstyle names constrained to curated list (19 male styles + 22 female styles)
- `sex` param controls which style list is used; if omitted, GPT detects gender from photo
- Pro mode adds: `color.formula`, `color.developer_vol`, `color.bleach_required`, `celebrity_ref`, `cutting_guide`, `cutting_guide_th`, `care_tips_th`

```json
// Success response
{
  "analysis": {
    "face_shape": "oval",
    "skin_tone": "light",
    "personal_color": "Winter",
    "hair_texture": "straight",
    "hair_density": "medium",
    "hair_length_current": "medium",
    "natural_hair_color": "Black",
    "hairline_type": "rounded",
    "forehead_size": "medium",
    "overall_vibe": ["Clean", "Smart", "Friendly"],
    "best_match": {
      "name": "Two Block",
      "match_score": 95,
      "fade_level": "none",
      "top_length_cm": 12,
      "maintenance": "medium",
      "reason": "Complements oval face shape with a clean professional look."
    },
    "good_options": [
      { "name": "Comma Hair", "match_score": 90, "reason": "..." },
      { "name": "Curtain Bangs (male)", "match_score": 85, "reason": "..." },
      { "name": "Side Part", "match_score": 80, "reason": "..." }
    ],
    "not_recommended": [
      { "name": "Mohawk", "reason": "..." },
      { "name": "Buzz Cut", "reason": "..." },
      { "name": "Bowl Cut", "reason": "..." }
    ],
    "parting_recommendation": "Side part works best",
    "fringe_recommendation": "Light curtain fringe",
    "length_options": {
      "short_verdict": "Clean and sharp",
      "short_cm": "3-6",
      "medium_verdict": "Best balance (recommended)",
      "medium_cm": "7-12",
      "long_verdict": "Softer vibe",
      "long_cm": "13+"
    },
    "color": {
      "recommended": [
        { "name": "Natural Black", "hex": "#1a1a1a", "tone": "neutral" },
        { "name": "Dark Brown", "hex": "#3b1f0f", "tone": "warm" },
        { "name": "Ash Brown", "hex": "#7a6a5a", "tone": "cool" },
        { "name": "Espresso", "hex": "#2c1a0e", "tone": "warm" }
      ],
      "avoid": [
        { "name": "Platinum Blonde", "reason": "Too high contrast for Winter tone" },
        { "name": "Warm Orange", "reason": "Clashes with cool undertone" }
      ],
      "formula": null,
      "developer_vol": null,
      "bleach_required": null
    },
    "celebrity_ref": null,
    "summary": "Strong oval face shape with balanced proportions. Winter personal color suits cool, deep tones.",
    "care_tips": ["Use sulfate-free shampoo", "Apply heat protectant before blow-drying"]
  }
}

// Pro-only additional fields in analysis:
{
  "color": {
    "formula": "1 bleach round + Ash Brown 7.1 1:1.5",
    "developer_vol": 30,
    "bleach_required": true
  },
  "celebrity_ref": {
    "name": "Gulf Kanawut",
    "similarity_reason": "Oval face + light skin tone closely matches Gulf's facial structure"
  },
  "cutting_guide": {
    "overview": "Two block with medium top length, clean sides with no fade.",
    "section_prep": "...",
    "sides": "Guard #2 (6mm) sides, taper at temple...",
    "back": "...",
    "top": "12cm at crown, 45° elevation, point-cut ends...",
    "fringe": "Light curtain fringe, 8cm, swept left...",
    "blending": "...",
    "texture_detail": "...",
    "finishing": "...",
    "tools": ["Clippers guard #2", "Scissors 6 inch", "Thinning shears"],
    "color_application": "Pre-lighten with 30vol x2, then apply Ash Brown 1:1.5 20vol, 30min",
    "estimated_time": "Consultation 5min · Cut 30min · Color 60min = ~95min total",
    "common_mistakes": "Over-thinning the crown reduces the Two Block volume illusion."
  },
  "cutting_guide_th": { "...": "เนื้อหาเหมือน cutting_guide แต่ภาษาไทย" },
  "care_tips_th": ["ใช้แชมพูสูตร sulfate-free", "ทาฮีทโปรเทคแตนท์ก่อนใช้ไดร์"]
}

// Error response
{ "error": "Analysis failed. Please try again." }
```

---

### `POST /api/card`

**Request:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "analysis": { "...": "AnalysisJSON from /api/analyze" },
  "isPro": false,
  "sex": "male",
  "additionalContext": {
    "desired_style": "Two Block",
    "target_color": "Ash Brown"
  },
  "photoWarning": false
}
```

- Constructs a detailed 7-block infographic prompt from analysis values
- Resolves `bestLength`, `bestParting`, `bestColor` deterministically before injecting into prompt (avoids AI misinterpreting relative verdicts)
- Calls `openai.images.edit` with `gpt-image-2`, size `1024x1792`, quality `high`
- Logs 3 files per request to `/logs/`: `{timestamp}.json`, `{timestamp}.prompt.txt`, `{timestamp}.card.png`

**Card blocks:**
| Block | Content |
|---|---|
| 1 | Hair & Face Analysis — photo + 7 stat rows |
| 2+3 | Best Hairstyles (green border) + Not Recommended (red border) side by side |
| 4 | Hair Length — 5 thumbnails, gold star on best |
| 5 | Parting & Fringe — 6 thumbnails, gold star on best |
| 6 | Hair Color — swatch panel + 4 color thumbnails |
| 7 | Your Best Look — try-on thumbnail + stat panel (+ celebrity thumbnail if Pro) |
| Footer | Salon branding + optional photo warning |

**Watermark:** `FREE` (gray, 18% opacity) for Free tier · `PRO` (gold, 12% opacity) for Pro tier

```json
// Success response
{ "image": "data:image/png;base64,..." }

// Error response
{ "error": "Card generation failed" }
```

---

### `POST /api/tryon` (legacy)

Original endpoint from the old tryon flow. Still present but not used in the current analyze+card flow.

**Request:**
```json
{
  "image": "data:image/jpeg;base64,...",
  "styleName": "Two Block",
  "styleDescription": "Short sides, longer top, clean disconnected look"
}
```

- Calls `openai.images.edit` with `gpt-image-1`, 1024×1024px
- Returns edited photo with new hairstyle applied to the same face
- Max image size: 4MB

```json
// Success response
{ "image": "data:image/png;base64,..." }

// Error response
{ "error": "AI ไม่สามารถประมวลผลได้ กรุณาลองใหม่" }
```

---

## Data & State

### localStorage keys

| Key | Type | Purpose |
|---|---|---|
| `hair_salon_tryon` | `TryonResult` | Current session result (original image, generated card, analysis JSON) |
| `hair_salon_unified` | `HistoryRecord[]` | All AI scans + bookings combined (text-only, newest first) |
| `hair_salon_pro` | `"true"` | Pro mode flag |
| `hair_salon_profile` | `UserProfile` | User sex preference (`male` / `female` / null) |
| `hair_salon_history` | `VisitRecord[]` | Legacy booking history (kept for migration) |

### Key types (`lib/store.ts`)

**`AnalysisJSON`** — full GPT-4o output:
- Basic: face shape, skin tone, personal color, hair texture/density, best match, good options, not recommended, length options, parting/fringe recommendation, color recommendations, summary, care tips
- Pro-only additions: `color.formula`, `color.developer_vol`, `color.bleach_required`, `celebrity_ref`, `cutting_guide` (EN), `cutting_guide_th` (TH), `care_tips_th`

**`TryonResult`** — current session:
- `originalImage` (base64), `generatedImage` (base64), `selectedStyle`, `styleIndex`, `analysis`, `isPro`, `qaAnswers`

**`HistoryRecord`** — unified record for both AI scans and bookings:
- `type: "ai-free" | "ai-pro" | "booking"` determines which fields are populated
- AI fields: `bestMatch`, `faceShape`, `personalColor`, `skinTone`, `hairTexture`, `hairDensity`, `maintenance`, `summary`, `topColors`, `goodOptions`, `notRecommended`, `careTips`, `careTipsTh`, `celebrityRef`, `cuttingGuide`, `cuttingGuideTh`, `qaAnswers`, `colorFormula`, `colorDeveloper`, `colorBleach`
- Booking fields: `stylistName`, `bookingDate`, `bookingTime`, `estimatedPrice`

### Inter-page data flow

```
/tryon
  → saveTryonResult()     → localStorage[hair_salon_tryon]     (session result)
  → saveHistoryRecord()   → localStorage[hair_salon_unified]   (scan record)

/brief
  ← loadTryonResult()     ← localStorage[hair_salon_tryon]

/booking
  ← loadTryonResult()     ← localStorage[hair_salon_tryon]    (style name + pricing)
  → saveHistoryRecord()   → localStorage[hair_salon_unified]   (booking record)

/profile
  ← loadUnifiedHistory()  ← localStorage[hair_salon_unified]
```

No global state manager — all cross-page state flows through localStorage.

---

## AI Prompt Design

### Photo Check Prompt (`checkOnly: true`)
- Runs at `temperature: 0` for determinism
- Explicitly flags any headwear (hat, beanie, hijab, etc.) as unsuitable even when face is fully visible
- "UNCERTAIN → unsuitable: true" as a safe default
- Sunglasses alone are NOT flagged

### Analysis Prompt (`checkOnly: false`)
- Forces all output in English (except `cutting_guide_th` and `care_tips_th`)
- Constrains hairstyle names to a curated list: **19 male styles** (Two Block, Comma Hair, Taper Fade, Burst Fade, Drop Fade, Mullet, Korean Perm, Curtain Bangs (male), Side Part, Undercut, Buzz Cut, Crew Cut, French Crop, Quiff, Slick Back, Textured Crop, Bowl Cut, Man Bun, Mohawk) and **22 female styles** (Wendy Cut, Hush Cut, Layered Slide Cut, Wolf Cut, Shag Cut, Bob Cut, French Bob, Lob, Pixie Cut, Straight Blunt Cut, Butterfly Cut, Hime Cut, Curtain Bangs, Wispy Bangs, Volume Magic, C-Curl, S-Wave Perm, Korean Perm (female), Collarbone Cut, Octopus Cut, Bixie Cut, Asymmetric Bob)
- `sex` param routes to the correct style sublist; omitting it lets GPT detect from photo
- Requires exactly 3 `good_options`, 3 `not_recommended`, 4–5 color recommendations, 2–3 avoid colors
- Pro mode: passes lifestyle Q&A context, requests celebrity ref (Thai-first priority), cutting guide both EN and TH with full technical detail (guard numbers, cm measurements, elevation angles, tool list, timing breakdown)

### Card Generation Prompt
- 7-block infographic with strict layout rules (no creative deviation)
- `bestLength` resolved by route handler: maps `top_length_cm` to a label bucket — avoids AI misinterpreting relative terms
- `bestParting` resolved by style-to-parting override map (e.g. Two Block → Side Part, Comma Hair → Comma Hair, Wolf Cut → Curtain Bangs)
- `bestColor` = first item in `color.recommended`
- Block 7 switches between 2-column (no celeb) and 3-column (Pro with celeb) layout
- If Pro + Q&A filled: Block 7 left thumbnail shows the requested style/color try-on instead of best match
- FREE watermark: `#999999` at 18% opacity · PRO watermark: `#c8a96e` gold at 12% opacity

---

## Hairstyle Catalogue (`lib/hairstyles.ts`)

Used for the old booking add-on pricing. Each entry has `name`, `nameEn`, `emoji`, `description` (used in the old `/api/tryon` prompt), and `brief` (side/top/back technical details). Not used in the current analyze+card flow — the style list is embedded directly in the analyze prompt.

---

## File Structure

```
app/
  page.tsx                  Landing, Pro activation
  tryon/page.tsx            Main scan flow (5 states: upload→preview→qa→analyzing→result)
  brief/page.tsx            Technical brief view (card + Pro cutting guide)
  booking/page.tsx          Booking flow
  profile/page.tsx          Unified history + HistoryModal
  api/
    analyze/route.ts        Photo check + GPT-4o full analysis
    card/route.ts           GPT-Image-2 infographic card generation + logging
    tryon/route.ts          Legacy hair try-on (gpt-image-1, not used in current flow)

components/
  ImageUpload.tsx           Drag-and-drop photo uploader
  Nav.tsx                   Bottom nav (mobile) / top nav (desktop), usePathname for active tab
  StylistCard.tsx           Stylist list + static data
  TimeSlotPicker.tsx        Date/time slot selector

lib/
  store.ts                  All localStorage helpers + TypeScript types (TryonResult, HistoryRecord, AnalysisJSON)
  hairstyles.ts             Static hairstyle catalogue (legacy, for booking add-ons)

logs/                       Auto-saved per card request: .json · .prompt.txt · .card.png (gitignored)
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

Node.js >= 18.17.0 required. If `node --version` shows older, reload PATH:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

---

## Deployment

Live URL: **https://ai-power-hair-salon.vercel.app**

Hosted on [Vercel](https://vercel.com) (Hobby tier — free, no expiry).

### Deploy steps
1. Push to `main` branch on GitHub → Vercel redeploys automatically
2. Set `OPENAI_API_KEY` in Vercel → Settings → Environment Variables

### Environment notes
- File system logging (`/logs`) is disabled on Vercel (read-only filesystem) — logs are written only when running locally in `development` mode
- API calls always hit the network — nothing is cached by the Service Worker

---

## PWA (Progressive Web App)

The app is installable as a PWA on iOS and Android without an app store.

### Install on iPhone
1. Open **Safari** (must be Safari, not Chrome)
2. Go to `https://ai-power-hair-salon.vercel.app`
3. Tap **Share** → **Add to Home Screen**
4. Tap **Add** — icon appears on Home Screen
5. Opens fullscreen like a native app

### Install on Android
1. Open **Chrome**
2. Go to the URL
3. Tap the **Install** banner or Menu → **Add to Home Screen**

### PWA files
| File | Purpose |
|---|---|
| `public/manifest.json` | App name, icons, theme color, display mode |
| `public/sw.js` | Service Worker — caches static pages, skips `/api/` routes |
| `public/apple-touch-icon.png` | 180×180 iOS Home Screen icon |
| `public/icon-192.png` | Android icon |
| `public/icon-512.png` | Android splash / high-res |
| `public/favicon-32.png` | Browser tab icon |

### iOS camera note
iOS PWA blocks `getUserMedia()` (JavaScript camera access). The app detects iPhone automatically and uses native `<input capture="user">` instead — opening the iPhone camera directly. Works identically from the user's perspective.

### Clear PWA cache on iPhone
- **Quick:** Long-press icon → Remove App → Delete App → reinstall via Safari
- **Full Safari cache:** Settings → Safari → Clear History and Website Data
- **Site only:** Settings → Safari → Advanced → Website Data → delete `vercel.app`
