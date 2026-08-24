import type { VercelRequest, VercelResponse } from "@vercel/node";
import { GoogleGenAI } from "@google/genai";

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

    // Safely parse body if received as string or Buffer
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

    const { text, projectName, tags } = body;
    if (!text || typeof text !== "string" || text.trim() === "") {
      return res.status(400).json({ error: "Text is required for enhancement." });
    }

    const prompt = `You are a professional executive work log assistant. Clean up and format the following raw daily work log note.

Rules:
1. Fix grammar, spelling, run-on sentences, and transcription quirks (from voice-to-text).
2. Format into clear, concise, professional bullet points starting with strong past-tense action verbs (e.g., "Implemented", "Refactored", "Investigated", "Attended", "Resolved", "Drafted").
3. Preserve all factual details, technical terms, ticket numbers, metrics, and outcomes without adding any invented, speculative, or hallucinated details.
4. Keep the bullet points punchy and mentor/manager-ready.
${projectName ? `5. Context Project: ${projectName}` : ""}
${tags && Array.isArray(tags) && tags.length > 0 ? `6. Associated Categories/Tags: ${tags.join(", ")}` : ""}

Raw work log note:
"""
${text.trim()}
"""

Output only the polished bullet points (using standard markdown "- " for each point), without preamble, greetings, conversational filler, or commentary.`;

    const ai = new GoogleGenAI({ apiKey });
    const candidateModels = ["gemini-3.7-flash", "gemini-flash-latest", "gemini-3.1-flash-lite"];
    let enhancedText: string | null = null;
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: prompt,
        });

        if (response && response.text) {
          enhancedText = response.text.trim();
          break;
        }
      } catch (err: any) {
        lastError = err;
        console.warn(`Model ${model} failed:`, err?.message || err);
        // Continue to fallback model
      }
    }

    if (enhancedText) {
      return res.status(200).json({ enhancedText });
    }

    // If models failed, return original text safely with a warning message
    console.error("All enhancement models failed:", lastError);
    return res.status(200).json({
      enhancedText: text.trim(),
      warning: "AI enhancement temporarily unavailable; raw text preserved.",
    });
  } catch (error: any) {
    console.error("Fatal enhancement error:", error);
    return res.status(500).json({
      error: error?.message || "Failed to process enhancement request.",
    });
  }
}
