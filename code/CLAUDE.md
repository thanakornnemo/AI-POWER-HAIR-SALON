# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start dev server at http://localhost:3000
npm run build    # Production build (also type-checks)
npm run lint     # ESLint
```

Node.js >= 18.17.0 required. If `node --version` shows older, reload PATH:
```powershell
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

## Architecture

**Next.js 13 App Router** — all pages are in `app/`, all reusable UI in `components/`, shared data/logic in `lib/`.

### Data flow between pages

There is no global state manager. The tryon result (original image, AI-generated image, selected style ID) is persisted to `localStorage` via `lib/store.ts` (`saveTryonResult` / `loadTryonResult`). Pages read from it on mount with `useEffect`.

Flow: `/tryon` → saves result → `/brief` reads it → `/booking` reads `selectedStyle` from it.

### Key data files

- `lib/hairstyles.ts` — single source of truth for all 6 hairstyle options. Each entry has `name` (Thai), `nameEn`, `emoji`, `description` (used in OpenAI prompt), and `brief` (side/top/back technical details shown on the Brief page). Add new styles here only.
- `lib/store.ts` — `TryonResult` interface + localStorage helpers. No imports from Next.js so it's safe to call from any client component.

### API route

`app/api/tryon/route.ts` — single POST endpoint. Receives `{ image: base64string, styleName, styleDescription }`, calls OpenAI `gpt-image-1` image edit, returns `{ image: base64string }`. The base64 input includes the `data:image/...;base64,` prefix which is stripped before sending to OpenAI.

### Pages

| Page | What it does |
|------|-------------|
| `/` | Static landing, links to `/tryon` |
| `/tryon` | 3-step flow: upload → select style → generate. Calls `/api/tryon`. On success, saves to localStorage and navigates to `/brief` |
| `/brief` | Reads localStorage, renders `TechnicalBrief` component. Shows empty state if no result |
| `/booking` | Fully client-side mock (no API). On payment button click, shows success screen inline |

### Navigation

`components/Nav.tsx` uses `usePathname()` to highlight the active tab. Bottom bar on mobile (`md:hidden`), top bar on desktop (`hidden md:flex`). Layout adds `pb-20 md:pb-0` to `<main>` to avoid content hiding behind the mobile bottom nav.

## Environment

`OPENAI_API_KEY` in `.env.local` — required only for `/api/tryon`. All other pages work without it.
