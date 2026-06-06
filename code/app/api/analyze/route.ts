import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const HAIRSTYLE_LIST = `
MALE styles (pick from these only):
Two Block, Drop Fade, Undercut, Crew Cut, Buzz Cut, Induction Cut, Textured Crop,
French Crop, Ivy League, Side Part, Quiff, Pompadour, Slick Back, Caesar Cut,
Comma Hair, Curtain Bangs (male), Wolf Cut (male), Korean Perm, Shaggy Cut (male),
Mullet, Mohawk, High Fade, Mid Fade, Low Fade, Skin Fade, Classic Taper,
Bowl Cut, Bro Flow, Man Bun

FEMALE styles (pick from these only):
Bob Cut, Lob (Long Bob), Pixie Cut, Shag Cut, Wolf Cut, Curtain Bangs (female),
Butterfly Cut, Hime Cut, Korean Perm (female), Body Wave Perm, Straight Blunt Cut,
Layered Cut, C-Curl Blow Dry, S-Wave, Wispy Bangs, Side-Swept Bangs, Collarbone Cut,
French Bob, Asymmetric Bob, Octopus Cut, Bixie Cut
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
    "name": "string (Asian celebrity name)",
    "similarity_reason": "string"
  }
`;

export async function POST(req: NextRequest) {
  try {
    const { image, isPro, additionalContext, skipCheck, checkOnly } = await req.json();

    if (!image) return NextResponse.json({ error: "No image provided" }, { status: 400 });

    const base64Data = image.includes(",") ? image.split(",")[1] : image;

    const proContext = isPro && additionalContext ? `
Additional context from client:
- Desired style: ${additionalContext.desired_style || "not specified"}
- Current color: ${additionalContext.current_color || "not specified"}
- Previously bleached: ${additionalContext.bleached_before ? "yes" : "no"}
- Target color: ${additionalContext.target_color || "not specified"}
- Lifestyle: ${additionalContext.lifestyle || "not specified"}

Use this context to personalise recommendations.
Fill in color.formula, color.developer_vol, color.bleach_required.
Fill in celebrity_ref with a well-known Asian/K-pop celebrity with a similar face shape.
` : "";

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
Rules:
- All fields in English only
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
      max_tokens: checkOnly ? 100 : 2000,
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
