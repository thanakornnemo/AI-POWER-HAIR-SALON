import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function base64ToBuffer(base64: string): Buffer {
  // Strip data URL prefix if present
  const data = base64.includes(",") ? base64.split(",")[1] : base64;
  return Buffer.from(data, "base64");
}

export async function POST(req: NextRequest) {
  try {
    const { image, styleName, styleDescription } = await req.json();

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const imageBuffer = base64ToBuffer(image);

    // Check size (max 4MB)
    if (imageBuffer.length > 4 * 1024 * 1024) {
      return NextResponse.json(
        { error: "กรุณาใช้รูปขนาดไม่เกิน 4MB" },
        { status: 400 }
      );
    }

    const prompt = `Edit this portrait photo to show the person with ${styleName} hairstyle.
Keep the person's face, skin tone, and facial features exactly the same.
Only change the hair. Make it look natural and realistic.
The hairstyle should be: ${styleDescription}`;

    const arrayBuf = imageBuffer.buffer as ArrayBuffer;
    const imageBlob = new Blob([arrayBuf.slice(imageBuffer.byteOffset, imageBuffer.byteOffset + imageBuffer.byteLength)], { type: "image/jpeg" });
    const imageFile = new File([imageBlob], "face.jpg", { type: "image/jpeg" });

    const response = await openai.images.edit({
      model: "gpt-image-1",
      image: imageFile,
      prompt,
      n: 1,
      size: "1024x1024",
    });

    const resultImage = response.data?.[0];
    if (!resultImage) throw new Error("No image in response");

    let base64Image: string;
    if (resultImage.b64_json) {
      base64Image = `data:image/png;base64,${resultImage.b64_json}`;
    } else if (resultImage.url) {
      const imgRes = await fetch(resultImage.url);
      const buf = await imgRes.arrayBuffer();
      base64Image = `data:image/png;base64,${Buffer.from(buf).toString("base64")}`;
    } else {
      throw new Error("No image in response");
    }

    return NextResponse.json({ image: base64Image });
  } catch (error: unknown) {
    console.error("Tryon API error:", error);
    const message =
      error instanceof Error ? error.message : "AI ไม่สามารถประมวลผลได้ กรุณาลองใหม่";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
