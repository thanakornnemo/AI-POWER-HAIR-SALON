import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const HAIRSTYLE_LIST = `
MALE styles (pick from these only):
Two Block, Comma Hair, Taper Fade, Burst Fade, Drop Fade, Mullet, Korean Perm,
Curtain Bangs (male), Side Part, Undercut, Buzz Cut, Crew Cut, French Crop,
Quiff, Slick Back, Textured Crop, Bowl Cut, Man Bun, Mohawk

FEMALE styles (pick from these only):
Wendy Cut, Hush Cut, Layered Slide Cut, Wolf Cut, Shag Cut, Bob Cut, French Bob,
Lob, Pixie Cut, Straight Blunt Cut, Butterfly Cut, Hime Cut, Curtain Bangs,
Wispy Bangs, Volume Magic, C-Curl, S-Wave Perm, Korean Perm (female),
Collarbone Cut, Octopus Cut, Bixie Cut, Asymmetric Bob
`;

const ANALYSIS_SCHEMA = `{
  "face_shape": "oval|round|square|heart|diamond|oblong",
  "skin_tone": "fair|light|medium|tan|deep",
  "personal_color": "Spring|Summer|Autumn|Winter",
  "hair_texture": "straight|wavy|curly|coily",
  "hair_density": "thin|medium|thick",
  "hair_length_current": "very_short|short|medium|long",
  "natural_hair_color": "string (e.g. Black, Dark Brown)",
  "hairline_type": "straight|widows_peak|receding|rounded",
  "forehead_size": "small|medium|large",
  "overall_vibe": ["3-5 English adjectives, e.g. Clean, Smart, Friendly"],
  "best_match": {
    "name": "string",
    "match_score": 0-100,
    "fade_level": "none|low|mid|high|skin",
    "top_length_cm": number,
    "maintenance": "low|medium|high",
    "reason": "string"
  },
  "good_options": [{"name": "string", "match_score": 0-100, "reason": "string"}],
  "not_recommended": [{"name": "string", "reason": "string"}],
  "parting_recommendation": "string",
  "fringe_recommendation": "string",
  "length_options": {
    "short_verdict": "string",
    "short_cm": "3-6",
    "medium_verdict": "string",
    "medium_cm": "7-12",
    "long_verdict": "string",
    "long_cm": "13+"
  },
  "color": {
    "recommended": [{"name": "string", "hex": "#xxxxxx", "tone": "warm|cool|neutral"}],
    "avoid": [{"name": "string", "reason": "string"}],
    "formula": null,
    "developer_vol": null,
    "bleach_required": null
  },
  "celebrity_ref": null,
  "summary": "string (2-3 sentences)",
  "care_tips": ["string array"]
}`;

const PRO_SCHEMA_ADDITIONS = `
  "color.formula": "string (e.g. 1 bleach round + Ash Brown 1:1.5)",
  "color.developer_vol": 20|30|40,
  "color.bleach_required": true|false,
  "celebrity_ref": {
    "name": "string (Thai/Asian celebrity name)",
    "similarity_reason": "string"
  },
  "cutting_guide": {
    "overview": "string (English)",
    "section_prep": "string (English)",
    "sides": "string (English)",
    "back": "string (English)",
    "top": "string (English)",
    "fringe": "string (English) — write 'none' only if truly no fringe",
    "blending": "string (English)",
    "texture_detail": "string (English)",
    "finishing": "string (English)",
    "tools": ["English list"],
    "color_application": "string (English) — write 'none' if no color work",
    "estimated_time": "string (English) e.g. 'Consultation 5min · Cut 30min = ~35min total'",
    "common_mistakes": "string (English)"
  },
  "cutting_guide_th": {
    "overview": "string (ภาษาไทย — 2-3 ประโยค อธิบาย shape/silhouette เป้าหมาย)",
    "section_prep": "string (ภาษาไทย — การแบ่งส่วน: การแสก จำนวน section การหนีบ ระดับความชื้น)",
    "sides": "string (ภาษาไทย — เทคนิคด้านข้าง: guard number แต่ละ zone ประเภท fade ทิศทาง)",
    "back": "string (ภาษาไทย — เทคนิคด้านหลัง: รูป neckline guard progression การ blend)",
    "top": "string (ภาษาไทย — ด้านบน: ความยาวเป็น cm มุม elevation การ point-cut)",
    "fringe": "string (ภาษาไทย — หน้าม้า: ความยาว มุมตัด วิธีลดน้ำหนัก) เขียน 'none' เฉพาะเมื่อไม่มีหน้าม้าจริงๆ",
    "blending": "string (ภาษาไทย — การเชื่อมต่อ: sides ต่อ top อย่างไร weight line อยู่ที่ไหน)",
    "texture_detail": "string (ภาษาไทย — การทำ texture: บริเวณที่ตัด เครื่องมือ ปริมาณที่ลด)",
    "finishing": "string (ภาษาไทย — การ blow-dry ทิศทาง ผลิตภัณฑ์ที่ใช้ วิธีจัดทรง)",
    "color_application": "string (ภาษาไทย — ขั้นตอนทำสี: ฟอก สูตรสี การ apply เวลา ล้างและ bond treatment) เขียน 'none' ถ้าไม่ทำสี",
    "estimated_time": "string (ภาษาไทย) e.g. 'ปรึกษา 5 นาที · ตัด 30 นาที = ~35 นาที'",
    "common_mistakes": "string (ภาษาไทย — 2-3 ข้อผิดพลาดที่พบบ่อยและวิธีหลีกเลี่ยง)"
  },
  "care_tips_th": ["string array ภาษาไทย — เหมือน care_tips แต่เป็นภาษาไทย"]
`;

export async function POST(req: NextRequest) {
  try {
    const { image, isPro, additionalContext, skipCheck, checkOnly, sex } = await req.json();

    if (!image) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const base64Data = image.includes(",") ? image.split(",")[1] : image;

    const qaContext = isPro && additionalContext ? `
Additional context from client:
- Desired style: ${additionalContext.desired_style || "not specified"}
- Current color: ${additionalContext.current_color || "not specified"}
- Previously bleached: ${additionalContext.bleached_before ? "yes" : "no"}
- Target color: ${additionalContext.target_color || "not specified"}
- Lifestyle: ${additionalContext.lifestyle || "not specified"}

Use this context to personalise recommendations and fill color.formula, color.developer_vol, color.bleach_required.
` : "";

    const celebInstruction = isPro ? `
Fill in celebrity_ref with a Thai celebrity or influencer who best matches this person.
Priority order for matching: 1) face shape 2) skin tone 3) hair texture 4) overall vibe.
MUST be Thai first — only use Korean/Japanese if absolutely no Thai match fits face shape + skin tone together.
The celebrity must be the same gender as detected in the photo.
similarity_reason must state face shape and skin tone match explicitly (e.g. "round face + medium skin tone, similar to...").

Fill in BOTH cutting_guide (English) and cutting_guide_th (Thai) for the best_match hairstyle, with identical technical content translated accurately. Also fill care_tips_th as the Thai translation of care_tips.
You are a master barber/stylist with 20 years experience. Write as if briefing a junior stylist who needs to execute this cut perfectly on their first attempt. Be extremely specific with:
- clipper guard numbers at every zone
- exact cm measurements at every section
- elevation angles (0°, 45°, 90°) and overdirection
- fade type and transition points relative to anatomical landmarks (occipital bone, parietal ridge, temporal recession)
- scissor techniques (point-cut, slide-cut, blunt, razor)
- product names and amounts
- common pitfalls specific to this style and this face/hair type
- time breakdown per step
Every field must be long, specific, and technically accurate. A stylist reading this should be able to execute the full service without asking any questions.
For color_application / color_application in cutting_guide_th: ALWAYS fill this field. Use target_color from client request if provided, otherwise use color.recommended[0]. Cover full coloring procedure — bleach steps if needed (ratio, developer vol, processing time), color formula, application sequence, processing time, rinse & neutralize, post-color bond treatment.
` : "";

    const proContext = qaContext + celebInstruction;

    const proSchemaNote = isPro
      ? `\nAlso fill these Pro-only fields:\n${PRO_SCHEMA_ADDITIONS}`
      : `\nSet color.formula, color.developer_vol, color.bleach_required, and celebrity_ref to null.`;

    const checkPrompt = `You are a photo quality checker for a hair salon AI system.
Return ONLY valid JSON with exactly these two fields: {"unsuitable": boolean, "reason": string}
No extra keys. No explanation outside the JSON. No markdown. No yapping.

TASK: Decide if this photo is suitable for a professional hairstyle recommendation.

Mark unsuitable: true if ANY of the following is true:
1. HEADWEAR — any hat, beanie, cap, hood, helmet, hijab, turban, or bandana is present, even if the face is fully visible. Headwear always = unsuitable.
2. NO HAIR/SCALP VISIBLE — at least some hair or scalp must be visible. Bald is acceptable if scalp is visible. Cropped-out forehead with no scalp = unsuitable.
3. FACE OBSCURED — face is hidden by mask, hands, or extreme shadow making facial structure unreadable. Note: sunglasses alone are NOT enough to mark unsuitable.
4. POOR IMAGE QUALITY — too blurry or too dark to assess facial features.
5. NOT A PERSON — cartoon, animal, object, or unidentifiable content.
6. UNCERTAIN — if you cannot confidently determine whether the photo is suitable, default to unsuitable: true.

Mark unsuitable: false ONLY when ALL of these are true:
- No headwear of any kind
- At least some hair or scalp is visible
- Face is clearly visible and assessable
- Image quality is sufficient

If unsuitable is false, set reason to "".`;

    const sexNote = sex === "male"
      ? "The client is MALE. Choose hairstyle names ONLY from the MALE styles list."
      : sex === "female"
      ? "The client is FEMALE. Choose hairstyle names ONLY from the FEMALE styles list."
      : "Detect gender from the photo and choose names from the appropriate list.";

    const fullPrompt = `Analyze this person's hair and face photo for a professional hair salon consultation.
${!skipCheck ? `FIRST: check if the photo is usable. If the face is significantly obscured, hair is completely hidden (e.g. fully covered by hat), the image is too blurry to assess features, or it is not a photo of a person — return ONLY this JSON and nothing else:
{"unsuitable": true, "reason": "one sentence explaining why in English"}
Partial obstruction or unusual angles are fine — do not flag these.

Otherwise return` : "Return"} ONLY valid JSON matching this exact schema — all values in English:
${ANALYSIS_SCHEMA}
${proSchemaNote}
${proContext}
Hairstyle reference list — choose names ONLY from this list:
${HAIRSTYLE_LIST}
${sexNote}
Rules:
- All fields in English only EXCEPT cutting_guide_th and care_tips_th which must be in Thai
- best_match.name and all good_options/not_recommended names must come from the list above
- good_options: exactly 3 styles
- not_recommended: exactly 3 styles
- color.recommended: 4-5 colors with hex codes
- color.avoid: 2-3 colors
- Be specific and technically accurate for a professional barber`;

    const prompt = checkOnly ? checkPrompt : fullPrompt;

    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: `data:image/jpeg;base64,${base64Data}`, detail: "high" },
            },
            { type: "text", text: prompt },
          ],
        },
      ],
      max_tokens: checkOnly ? 100 : 4000,
      temperature: checkOnly ? 0 : 0.7,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from AI");

    const parsed = JSON.parse(content);
    if (parsed.unsuitable) {
      return NextResponse.json({ unsuitable: true, reason: parsed.reason });
    }
    if (checkOnly) {
      return NextResponse.json({ unsuitable: false });
    }
    return NextResponse.json({ analysis: parsed });

  } catch (error: unknown) {
    console.error("Analyze API error:", error);
    const message = error instanceof Error ? error.message : "Analysis failed. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
