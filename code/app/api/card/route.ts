import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import fs from "fs";
import path from "path";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function base64ToFile(base64: string, filename: string): File {
  const data = base64.includes(",") ? base64.split(",")[1] : base64;
  const buffer = Buffer.from(data, "base64");
  const arrayBuf = buffer.buffer as ArrayBuffer;
  const blob = new Blob(
    [arrayBuf.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength)],
    { type: "image/jpeg" }
  );
  return new File([blob], filename, { type: "image/jpeg" });
}

export async function POST(req: NextRequest) {
  try {
    const { image, analysis, isPro, photoWarning } = await req.json();
    if (!image || !analysis) return NextResponse.json({ error: "Missing image or analysis" }, { status: 400 });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const logDir = path.join(process.cwd(), "logs");
    if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
    fs.writeFileSync(
      path.join(logDir, `${timestamp}.json`),
      JSON.stringify({ timestamp, analysis }, null, 2)
    );

    const best = analysis.best_match;
    const goodNames = analysis.good_options?.map((s: { name: string }) => s.name) ?? [];
    const notRecNames = analysis.not_recommended?.map((s: { name: string }) => s.name) ?? [];
    const colorRec = analysis.color?.recommended ?? [];
    const colorAvoid = analysis.color?.avoid?.map((c: { name: string }) => c.name).join(", ") ?? "";
    const vibe = analysis.overall_vibe?.join(", ") ?? "";

    const warmColors = colorRec.filter((c: { tone: string }) => c.tone === "warm").map((c: { name: string }) => c.name).join(", ");
    const coolColors = colorRec.filter((c: { tone: string }) => c.tone === "cool").map((c: { name: string }) => c.name).join(", ");
    const neutralColors = colorRec.filter((c: { tone: string }) => c.tone === "neutral").map((c: { name: string }) => c.name).join(", ");

    // Resolve best picks explicitly so prompt is unambiguous
    const lo = analysis.length_options;
    const bestLength = (() => {
      if (lo?.short_verdict && !lo.short_verdict.toLowerCase().includes("not") && !lo.short_verdict.includes("ไม่")) return `Short (${lo.short_cm}cm)`;
      if (lo?.medium_verdict && !lo.medium_verdict.toLowerCase().includes("not") && !lo.medium_verdict.includes("ไม่")) return `Medium-Short`;
      return `Medium (${lo?.medium_cm ?? "7-12"}cm)`;
    })();
    const bestParting = (() => {
      const p = (analysis.parting_recommendation ?? "").toLowerCase();
      if (p.includes("side") || p.includes("ข้าง")) return "Side Part";
      if (p.includes("no fringe") || p.includes("ไม่แนะนำ") || p.includes("ไม่มีหน้าม้า")) return "No Fringe";
      if (p.includes("curtain") || p.includes("กลาง")) return "Curtain Bangs";
      return "No Fringe";
    })();
    const bestColor = colorRec[0]?.name ?? "Dark Brown";

    const proColorSection = isPro && analysis.color?.formula ? `
HAIR COLOR FORMULA (Pro):
• Formula: ${analysis.color.formula}
• Developer: ${analysis.color.developer_vol}vol
• Bleach required: ${analysis.color.bleach_required ? "Yes" : "No"}` : "";

    const celebSection = isPro && analysis.celebrity_ref ? `
CELEBRITY REFERENCE section: Show a small portrait of ${analysis.celebrity_ref.name} next to the best match hairstyle as a style reference.` : "";

    const prompt = `You are a graphic design engine. Produce this exact infographic layout every time — no creative deviation. Use the uploaded portrait photo as the face reference for every person thumbnail.

CANVAS: Portrait 9:16, 1024×1792px, white #ffffff background throughout.
FONT: Single typeface — thin/light weight geometric sans-serif. Headers: uppercase, letter-spacing 0.25em. Labels: uppercase, letter-spacing 0.15em, size 9pt. Values: regular weight, 10pt.
COLORS: #111111 text · #f59e0b gold star badges · #22c55e green borders (recommended) · #ef4444 red borders (avoid) · #f5f5f5 light gray panel bg. No other colors.
SECTION DIVIDER: always "——— TITLE ———" centered, thin 0.5px hairline extending left and right to card edges.
THUMBNAIL: all portrait thumbnails identical size (width ~120px), 4:5 ratio, 2px rounded corners (radius 6px), 1px border. Gap between thumbnails: 10px.

━━━ BLOCK 1: HAIR & FACE ANALYSIS ━━━
Two-column row. Left col (40%): original photo, 4:5 crop, 1px border, subtle drop shadow. Right col (60%): light gray #f5f5f5 panel, 7 rows separated by 0.5px hairlines, each row has: [line icon 16px] [LABEL spaced caps] [value right-aligned].
Row 1: face icon · FACE SHAPE · ${analysis.face_shape}
Row 2: drop icon · SKIN TONE · ${analysis.skin_tone ?? "medium"}
Row 3: palette icon · PERSONAL COLOR · ${analysis.personal_color ?? "Autumn"}
Row 4: wave icon · HAIR TEXTURE · ${analysis.hair_texture}
Row 5: dots icon · HAIR DENSITY · ${analysis.hair_density}
Row 6: arc icon · HAIRLINE · ${analysis.hairline_type}
Row 7: star icon · VIBE · ${vibe}

━━━ BLOCK 2: BEST HAIRSTYLES ━━━
Section divider: ——— BEST HAIRSTYLES ———
3 thumbnails in one row, equal spacing, each with 2px green #22c55e border.
Thumbnail 1: "${best.name}" — gold ★ badge (16px circle, gold bg, white star) top-left corner
Thumbnail 2: "${goodNames[0] ?? ""}"
Thumbnail 3: "${goodNames[1] ?? ""}"
Below each thumbnail: label in spaced uppercase 9pt.

━━━ BLOCK 3: NOT RECOMMENDED ━━━
Section divider: ——— NOT RECOMMENDED ———
3 thumbnails in one row, each with 2px red #ef4444 border + red ✕ circle badge (16px) top-left.
Thumbnail 1: "${notRecNames[0] ?? ""}"
Thumbnail 2: "${notRecNames[1] ?? ""}"
Thumbnail 3: "${notRecNames[2] ?? ""}"
Below each thumbnail: label in spaced uppercase 9pt.

━━━ BLOCK 4: HAIR LENGTH ━━━
Section divider: ——— HAIR LENGTH ———
5 thumbnails in one row, equal spacing, 1px neutral border.
Left to right: "Short (${analysis.length_options?.short_cm}cm)" · "Medium-Short" · "Medium" · "Medium-Long" · "Long (${analysis.length_options?.long_cm}cm)"
Gold ★ badge ONLY on thumbnail labeled "${bestLength}". Label below each.

━━━ BLOCK 5: PARTING & FRINGE ━━━
Section divider: ——— PARTING & FRINGE ———
6 thumbnails in one row, 1px neutral border.
Left to right: "No Fringe" · "Curtain Bangs" · "Side Part" · "Comma Hair" · "Soft Fringe" · "Full Fringe"
Gold ★ badge ONLY on thumbnail labeled "${bestParting}". Label below each.

━━━ BLOCK 6: HAIR COLOR ━━━
Section divider: ——— HAIR COLOR ———
Two-column row:
Left (38%): light gray #f5f5f5 panel. 4 rows:
  WARM · circle swatches: ${warmColors || "Dark Brown"}
  COOL · circle swatches: ${coolColors || "Ash Grey"}
  NEUTRAL · circle swatches: ${neutralColors || "Natural Black"}
  AVOID · circle swatches with red diagonal cross: ${colorAvoid}
  Each swatch: 20px diameter circle filled with the actual hair color, label below in 7pt.
Right (62%): 4 thumbnails in one row, 1px neutral border.
  Left to right: "${colorRec[0]?.name ?? "Dark Brown"}" · "${colorRec[1]?.name ?? "Ash Grey"}" · "${colorRec[2]?.name ?? "Mocha Brown"}" · "${colorRec[3]?.name ?? "Jet Black"}"
  Gold ★ ONLY on "${bestColor}". Label below each.
${proColorSection}

━━━ BLOCK 7: YOUR BEST LOOK ━━━
Section divider: ——— YOUR BEST LOOK ———
Two-column row:
Left (40%): one medium portrait thumbnail (larger, ~180px wide) showing ${best.name} hairstyle + ${bestParting} + ${bestColor} hair color.
Right (60%): 2×2 grid, each cell = [16px line icon] + [label text 9pt uppercase]:
  [scissors icon] ${best.name}     [ruler icon] ${bestLength}
  [wave icon]     ${bestParting}   [circle icon] ${bestColor}
Below full width: pill tags row — thin 1px border rounded pills, 8pt uppercase spaced text:
  "${best.maintenance === "low" ? "LOW MAINTENANCE" : best.maintenance === "high" ? "HIGH MAINTENANCE" : "MEDIUM MAINTENANCE"}" · "${(analysis.overall_vibe ?? []).slice(0, 2).join('" · "')}"
Below pills: one italic line 9pt: "${(analysis.summary ?? "Clean, modern look. Easy to maintain.").split(".")[0]}."
${celebSection}

━━━ FOOTER ━━━
Full-width 0.5px hairline.
Centered text only:
  Line 1: "AI HAIR SALON" — bold, wide-tracked uppercase, 11pt
  Line 2: "BANGKOK" — light weight, uppercase, letter-spacing 0.3em, 8pt
${photoWarning ? `  Line 3: "⚠ Photo quality limited — result may vary" — italic, #aaaaaa, 7pt` : ""}
${isPro ? "" : 'WATERMARK: diagonal text "FREE" repeated across full card, #999999 at 18% opacity, 45° angle, evenly spaced — visible but not intrusive.'}`;


    fs.writeFileSync(
      path.join(logDir, `${timestamp}.prompt.txt`),
      prompt
    );

    const imageFile = base64ToFile(image, "face.jpg");

    const response = await openai.images.edit({
      model: "gpt-image-2",
      image: imageFile,
      prompt,
      n: 1,
      size: "1024x1792" as "1024x1536",
      quality: "high",
    });

    const result = response.data?.[0];
    if (!result) throw new Error("No image in response");

    let base64Image: string;
    if (result.b64_json) {
      base64Image = `data:image/png;base64,${result.b64_json}`;
    } else if (result.url) {
      const imgRes = await fetch(result.url);
      const buf = await imgRes.arrayBuffer();
      base64Image = `data:image/png;base64,${Buffer.from(buf).toString("base64")}`;
    } else {
      throw new Error("No image data in response");
    }

    const pngData = base64Image.split(",")[1];
    fs.writeFileSync(path.join(logDir, `${timestamp}.card.png`), Buffer.from(pngData, "base64"));

    return NextResponse.json({ image: base64Image });

  } catch (error: unknown) {
    console.error("Card API error:", error);
    const message = error instanceof Error ? error.message : "Card generation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
