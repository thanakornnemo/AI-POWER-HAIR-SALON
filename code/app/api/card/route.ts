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
    const { image, analysis, isPro, photoWarning, sex, additionalContext } = await req.json();
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
    const topCm = best?.top_length_cm ?? 0;
    const isFemale = sex === "female";

    const bestLength = (() => {
      if (isFemale) {
        if (topCm > 0 && topCm <= 12) return "Short (10cm)";
        if (topCm <= 18) return "Bob (15cm)";
        if (topCm <= 28) return "Lob (25cm)";
        if (topCm <= 38) return "Medium (35cm)";
        return "Long (45cm+)";
      } else {
        if (topCm > 0 && topCm <= 4) return "Short (3cm)";
        if (topCm <= 8) return "Medium-Short (6cm)";
        if (topCm <= 13) return "Medium (10cm)";
        if (topCm <= 18) return "Medium-Long (15cm)";
        return "Long (20cm+)";
      }
    })();

    const fringeThumbnails = isFemale
      ? `"No Fringe" · "Curtain Bangs" · "Wispy Bangs" · "Side Part" · "Soft Fringe" · "Full Fringe"`
      : `"No Fringe" · "Curtain Bangs" · "Side Part" · "Comma Hair" · "Soft Fringe" · "Full Fringe"`;

    const lengthThumbnails = isFemale
      ? `"Short (10cm)" · "Bob (15cm)" · "Lob (25cm)" · "Medium (35cm)" · "Long (45cm+)"`
      : `"Short (3cm)" · "Medium-Short (6cm)" · "Medium (10cm)" · "Medium-Long (15cm)" · "Long (20cm+)"`;

    const bestParting = (() => {
      const bestName = (best?.name ?? "").toLowerCase();
      const p = (analysis.parting_recommendation ?? "").toLowerCase();
      const f = (analysis.fringe_recommendation ?? "").toLowerCase();

      // Override by best_match style — some styles have signature parting
      const STYLE_PARTING: Record<string, string> = {
        "comma hair": "Comma Hair",
        "curtain bangs (male)": "Curtain Bangs",
        "curtain bangs": "Curtain Bangs",
        "side part": "Side Part",
        "two block": "Side Part",
        "korean perm": "Curtain Bangs",
        "wolf cut": "Curtain Bangs",
        "hime cut": "Full Fringe",
        "wispy bangs": "Wispy Bangs",
        "butterfly cut": "Curtain Bangs",
      };
      if (STYLE_PARTING[bestName]) return STYLE_PARTING[bestName];

      if (isFemale) {
        if (p.includes("curtain") || f.includes("curtain")) return "Curtain Bangs";
        if (f.includes("wispy")) return "Wispy Bangs";
        if (p.includes("side")) return "Side Part";
        if (f.includes("soft")) return "Soft Fringe";
        if (f.includes("full")) return "Full Fringe";
        return "No Fringe";
      } else {
        if (p.includes("side") || p.includes("ข้าง")) return "Side Part";
        if (p.includes("curtain") || p.includes("กลาง")) return "Curtain Bangs";
        if (p.includes("comma") || f.includes("comma")) return "Comma Hair";
        return "No Fringe";
      }
    })();
    const bestColor = colorRec[0]?.name ?? "Dark Brown";

    // Pro QA inputs
    const qaStyle = additionalContext?.desired_style || "";
    const qaColor = additionalContext?.target_color || "";
    const hasTryOn = isPro && (qaStyle || qaColor);

    // Color formula — only for user-specified color, else fall back to best match
    const formulaColor = qaColor || bestColor;
    const proColorFormula = isPro && analysis.color?.formula
      ? `COLOR FORMULA for "${formulaColor}": ${analysis.color.formula} · ${analysis.color.developer_vol}vol${analysis.color.bleach_required ? " · bleach first" : ""}`
      : "";

    const hasCeleb = isPro && !!analysis.celebrity_ref;

    // BLOCK 7 main thumbnail — try-on replaces best look if QA filled
    const tryOnLabel = qaStyle && qaColor
      ? `${qaStyle} + ${qaColor}`
      : qaStyle
      ? qaStyle
      : qaColor
      ? qaColor
      : "";

    const mainThumbnailInstruction = hasTryOn
      ? `Left (40%): one medium portrait thumbnail (~180px wide).
${qaStyle && qaColor
  ? `Show the subject with "${qaStyle}" hairstyle AND "${qaColor}" hair color applied together. Label below: "${tryOnLabel}" in spaced uppercase 9pt.`
  : qaStyle
  ? `Show the subject with "${qaStyle}" hairstyle, keeping current/natural hair color. Label below: "TRY: ${qaStyle}" in spaced uppercase 9pt.`
  : `Show the subject with current hairstyle but hair color changed to "${qaColor}". Label below: "TRY: ${qaColor}" in spaced uppercase 9pt.`
}`
      : `Left (40%): one medium portrait thumbnail (~180px wide) showing ${best.name} hairstyle at exactly ${bestLength} length + ${bestParting} + ${bestColor} hair color. The hair length in this thumbnail must visually match the "${bestLength}" thumbnail in BLOCK 4.`;

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

━━━ BLOCK 2+3: BEST HAIRSTYLES & NOT RECOMMENDED (side by side) ━━━
Single full-width row divided into two halves by a thin 0.5px vertical hairline in the center.
Left half — label "——— BEST HAIRSTYLES ———" centered above, then 3 thumbnails in one row with 2px green #22c55e border each. Thumbnail 1: "${best.name}" — gold ★ badge top-left. Thumbnail 2: "${goodNames[0] ?? ""}". Thumbnail 3: "${goodNames[1] ?? ""}".
Right half — label "——— NOT RECOMMENDED ———" centered above, then 3 thumbnails in one row with 2px red #ef4444 border + red ✕ circle badge (16px) top-left each. Thumbnail 1: "${notRecNames[0] ?? ""}". Thumbnail 2: "${notRecNames[1] ?? ""}". Thumbnail 3: "${notRecNames[2] ?? ""}".
Below each thumbnail: label in spaced uppercase 9pt. All 6 thumbnails same size, same vertical alignment.

━━━ BLOCK 4: HAIR LENGTH ━━━
Section divider: ——— HAIR LENGTH ———
5 thumbnails in one row, equal spacing, 1px neutral border.
${isFemale
  ? `Draw each thumbnail with STRICTLY accurate hair length matching the cm value:
  Thumbnail 1 "Short (10cm)": hair ends exactly at jaw — NOT touching shoulders.
  Thumbnail 2 "Bob (15cm)": hair ends exactly at chin — clearly longer than jaw.
  Thumbnail 3 "Lob (25cm)": hair ends at collarbone — clearly past chin.
  Thumbnail 4 "Medium (35cm)": hair ends at shoulder — clearly past collarbone.
  Thumbnail 5 "Long (45cm+)": hair ends well past shoulder — longest of all.`
  : `Draw each thumbnail with STRICTLY accurate hair length matching the cm value:
  Thumbnail 1 "Short (3cm)": near-buzzed, sides very close to scalp, top very short.
  Thumbnail 2 "Medium-Short (6cm)": ear clearly visible, hair above ear line.
  Thumbnail 3 "Medium (10cm)": hair covers ear, slightly over ear.
  Thumbnail 4 "Medium-Long (15cm)": hair touches shirt collar.
  Thumbnail 5 "Long (20cm+)": hair clearly below collar, noticeably long.`}
Each thumbnail must look DISTINCTLY different from the adjacent one — no two thumbnails should look similar in hair length.
Gold ★ badge ONLY on thumbnail labeled "${bestLength}". Label (cm value only) below each.

━━━ BLOCK 5: PARTING & FRINGE ━━━
Section divider: ——— PARTING & FRINGE ———
6 thumbnails in one row, 1px neutral border.
Left to right: ${fringeThumbnails}
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

━━━ BLOCK 7: YOUR BEST LOOK ━━━
Section divider: ——— YOUR BEST LOOK ———
${hasCeleb ? `Three-column row:

Left col (40%): portrait thumbnail (~150px wide).
${mainThumbnailInstruction.replace("Left (40%): one medium portrait thumbnail (larger, ~180px wide)", "  Thumbnail")}
${proColorFormula ? `  Below thumbnail: "${proColorFormula}" — #666666, 7pt, left-aligned, max 1 line.` : ""}

Center col (35%): light gray #f5f5f5 panel, full height. Rows separated by 0.5px hairlines, each: [16px icon] [LABEL spaced caps 8pt] [value right-aligned 9pt]:
  Row 1: [scissors] STYLE · ${best.name}
  Row 2: [ruler]    LENGTH · ${bestLength}
  Row 3: [wave]     PARTING · ${bestParting}
  Row 4: [circle]   COLOR · ${bestColor}

Right col (25%): vertically centered. Draw a portrait thumbnail (~80px wide, 4:5 ratio, 1px border) of ${analysis.celebrity_ref?.name ?? ""} — illustrate as a stylized portrait matching the celebrity's known look. Below thumbnail: name "${analysis.celebrity_ref?.name ?? ""}" in bold 8pt centered. Below name: "${analysis.celebrity_ref?.similarity_reason ?? ""}" in #888888 7pt centered, max 2 lines.`

: `Two-column row:

Left col (50%): portrait thumbnail (~180px wide).
${mainThumbnailInstruction.replace("Left (40%): one medium portrait thumbnail (larger, ~180px wide)", "  Thumbnail")}
${proColorFormula ? `  Below thumbnail: "${proColorFormula}" — #666666, 7pt, left-aligned, max 1 line.` : ""}

Right col (50%): light gray #f5f5f5 panel, full height. Rows separated by 0.5px hairlines, each: [16px icon] [LABEL spaced caps 8pt] [value right-aligned 9pt]:
  Row 1: [scissors] STYLE · ${best.name}
  Row 2: [ruler]    LENGTH · ${bestLength}
  Row 3: [wave]     PARTING · ${bestParting}
  Row 4: [circle]   COLOR · ${bestColor}`}

━━━ FOOTER ━━━
Full-width 0.5px hairline.
Centered text only:
  Line 1: "AI HAIR SALON" — bold, wide-tracked uppercase, 11pt
  Line 2: "BANGKOK" — light weight, uppercase, letter-spacing 0.3em, 8pt
${photoWarning ? `  Line 3: "⚠ Photo quality limited — result may vary" — italic, #aaaaaa, 7pt` : ""}
${isPro
  ? 'WATERMARK: diagonal text "PRO" repeated across full card, #c8a96e at 12% opacity, 45° angle, evenly spaced — very subtle gold tint.'
  : 'WATERMARK: diagonal text "FREE" repeated across full card, #999999 at 18% opacity, 45° angle, evenly spaced — visible but not intrusive.'}`;


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
