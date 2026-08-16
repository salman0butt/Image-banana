import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { normalizeImageInput } from "@/lib/image-data";

export async function POST(request: Request) {
    try {
        const { imageBase64, prompt } = await request.json();
        const { data, mimeType } = normalizeImageInput(imageBase64);

        if (typeof prompt !== "string" || prompt.trim().length === 0) {
            return NextResponse.json({ error: "A prompt is required." }, { status: 400 });
        }

        if (!process.env.GOOGLE_API_KEY) {
            return NextResponse.json({ error: "GOOGLE_API_KEY is not configured." }, { status: 500 });
        }

        const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY });

        const interaction = await client.interactions.create({
            model: "gemini-3.1-flash-lite-image",
            input: [
                { type: "text", text: prompt },
                {
                    type: "image",
                    data,
                    mime_type: mimeType,
                },
            ],
        });

        const outputImage = interaction.output_image;

        if (!outputImage?.data) {
            return NextResponse.json({ error: "Gemini did not return an edited image." }, { status: 502 });
        }

        const outputMimeType = outputImage.mime_type ?? "image/png";

        return NextResponse.json({
            imageBase64: `data:${outputMimeType};base64,${outputImage.data}`,
            prompt,
        });
    } catch (error) {
        console.error("Gemini image edit failed:", error);
        const details = error instanceof Error ? error.message : String(error);
        const isQuotaError = /(?:429|quota exceeded|resource_exhausted)/i.test(details);

        return NextResponse.json(
            {
                error: isQuotaError
                    ? "Gemini quota exceeded for this project."
                    : "Gemini image editing failed.",
                details: process.env.NODE_ENV === "development" ? details : undefined,
            },
            { status: isQuotaError ? 429 : 500 },
        );
    }
}
