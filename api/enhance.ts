import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateWithFallback } from "./_gemini";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { text, projectName, tags } = req.body || {};
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
${tags && tags.length > 0 ? `6. Associated Categories/Tags: ${tags.join(", ")}` : ""}

Raw work log note:
"""
${text.trim()}
"""

Output only the polished bullet points (using standard markdown "- " for each point), without preamble, greetings, conversational filler, or commentary.`;

    const response = await generateWithFallback({
      contents: prompt,
    });

    const enhancedText = response.text ? response.text.trim() : text;
    return res.status(200).json({ enhancedText });
  } catch (error: any) {
    console.error("Enhancement error:", error);
    return res.status(503).json({
      error: "AI service is currently experiencing high demand. Please try again in a few seconds.",
    });
  }
}
