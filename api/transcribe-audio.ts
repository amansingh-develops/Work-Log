import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateWithFallback } from "./_gemini";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "25mb",
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { audioBase64, mimeType, projectName, tags, autoEnhance } = req.body || {};
    if (!audioBase64 || typeof audioBase64 !== "string") {
      return res.status(400).json({ error: "Audio data is required for transcription." });
    }

    // Extract pure base64 payload cleanly
    const base64Index = audioBase64.indexOf(";base64,");
    let cleanBase64 = base64Index !== -1
      ? audioBase64.substring(base64Index + 8)
      : audioBase64.replace(/^data:[^,]+,/, "");
    
    cleanBase64 = cleanBase64.replace(/\s+/g, "");

    if (!cleanBase64) {
      return res.status(400).json({ error: "Invalid or empty audio data provided." });
    }

    // Sanitize MIME type
    let targetMimeType = "audio/webm";
    if (mimeType && typeof mimeType === "string") {
      targetMimeType = mimeType.split(";")[0].trim().toLowerCase();
    } else if (audioBase64.startsWith("data:")) {
      const headerMime = audioBase64.substring(5, audioBase64.indexOf(";")).split(";")[0].trim().toLowerCase();
      if (headerMime) targetMimeType = headerMime;
    }
    if (!targetMimeType.startsWith("audio/")) {
      targetMimeType = "audio/webm";
    }

    const promptText = autoEnhance
      ? `You are an expert executive transcription and daily work log assistant.
Listen carefully to the spoken voice recording:
1. Transcribe the spoken work updates accurately, recognizing technical developer terminology, tools, libraries, code artifacts, and project tasks (e.g., APIs, pull requests, debugging, refactoring, database schemas, meetings).
2. Clean up into concise, professional work log bullet points starting with active past-tense verbs (e.g., "Implemented", "Investigated", "Attended", "Resolved", "Refactored", "Configured").
${projectName ? `Project Context: ${projectName}` : ""}
${tags && tags.length > 0 ? `Tags/Categories: ${tags.join(", ")}` : ""}

Output ONLY the formatted markdown bullet points (using "- " for each point), without any conversational preambles, greetings, or meta commentary.`
      : `You are an expert audio transcriber. Listen carefully to the voice recording and transcribe the exact words spoken verbatim.
Accurately capture technical developer terminology, acronyms, and names.
Output ONLY the transcribed text without filler, markdown headers, or meta commentary.`;

    const response = await generateWithFallback({
      contents: [
        {
          inlineData: {
            mimeType: targetMimeType,
            data: cleanBase64,
          },
        },
        {
          text: promptText,
        },
      ],
    });

    const transcript = response.text ? response.text.trim() : "";
    return res.status(200).json({
      transcript,
      enhancedText: autoEnhance ? transcript : undefined,
    });
  } catch (error: any) {
    console.error("Audio transcription error:", error);
    return res.status(503).json({
      error: "Voice transcription is currently experiencing high demand. Please try again.",
    });
  }
}
