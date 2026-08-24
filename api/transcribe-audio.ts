import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

export const config = {
  api: {
    bodyParser: {
      sizeLimit: "25mb",
    },
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed. Use POST." });
  }

  try {
    const rawKey = process.env.GEMINI_API_KEY;
    const apiKey = rawKey ? rawKey.replace(/^["']|["']$/g, "").trim() : "";

    if (!apiKey) {
      console.error("GEMINI_API_KEY is not configured in environment variables.");
      return res.status(400).json({
        error: "GEMINI_API_KEY is missing in your Vercel Environment Variables. Please add GEMINI_API_KEY in Vercel Project Settings.",
      });
    }

    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    } else if (!body) {
      body = {};
    }

    const { audioBase64, mimeType, projectName, tags, autoEnhance } = body;
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
${tags && Array.isArray(tags) && tags.length > 0 ? `Tags/Categories: ${tags.join(", ")}` : ""}

Output ONLY the formatted markdown bullet points (using "- " for each point), without any conversational preambles, greetings, or meta commentary.`
      : `You are an expert audio transcriber. Listen carefully to the voice recording and transcribe the exact words spoken verbatim.
Accurately capture technical developer terminology, acronyms, and names.
Output ONLY the transcribed text without filler, markdown headers, or meta commentary.`;

    const ai = new GoogleGenAI({ apiKey });
    const candidateModels = ["gemini-3.7-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    let transcript: string | null = null;
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
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

        if (response && response.text) {
          transcript = response.text.trim();
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Audio model ${model} failed:`, err?.message || err);
      }
    }

    if (transcript !== null) {
      return res.status(200).json({
        transcript,
        enhancedText: autoEnhance ? transcript : undefined,
      });
    }

    console.error("All transcription models failed:", lastError);
    return res.status(503).json({
      error: "Audio transcription is currently unavailable. Please try again or use live speech dictation.",
    });
  } catch (error: any) {
    console.error("Fatal audio transcription error:", error);
    return res.status(500).json({
      error: error?.message || "Failed to process audio transcription.",
    });
  }
}
