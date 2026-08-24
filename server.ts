import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Increase payload limit to support audio uploads (base64)
  app.use(express.json({ limit: "25mb" }));

  // Gemini instance helper with mandated User-Agent telemetry
  const getAI = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not configured in environment.");
    }
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  };

  // Helper for generating content with exponential backoff retries and fallback models
  const generateWithFallback = async (
    params: {
      contents: any;
      config?: any;
    },
    primaryModel = "gemini-3.7-flash"
  ) => {
    const ai = getAI();
    const candidateModels = [
      primaryModel,
      "gemini-flash-latest",
      "gemini-3.1-flash-lite",
    ].filter((m, i, arr) => arr.indexOf(m) === i);

    let lastError: any = null;

    for (const model of candidateModels) {
      // Try up to 2 attempts per candidate model
      for (let attempt = 0; attempt < 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model,
            contents: params.contents,
            ...(params.config ? { config: params.config } : {}),
          });
          return response;
        } catch (err: any) {
          lastError = err;
          const status = err?.status || err?.code || (err?.message?.includes("503") ? 503 : 0);
          const isTransient =
            status === 503 ||
            status === 429 ||
            status === "UNAVAILABLE" ||
            status === "RESOURCE_EXHAUSTED" ||
            err?.message?.includes("high demand") ||
            err?.message?.includes("overloaded");

          console.warn(
            `Model ${model} attempt ${attempt + 1} failed (status: ${status}): ${err?.message}`
          );

          if (!isTransient) {
            // Non-transient error (e.g. invalid arguments or bad base64) - don't retry same model
            break;
          }

          // Backoff before next attempt
          const delay = (attempt + 1) * 600;
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
      console.warn(`Failing over from ${model} to next candidate model...`);
    }

    throw lastError || new Error("All Gemini models are currently busy. Please try again in a few moments.");
  };

  // API Route: Enhance work log text
  app.post("/api/enhance", async (req, res) => {
    try {
      const { text, projectName, tags } = req.body;
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
      return res.json({ enhancedText });
    } catch (error: any) {
      console.error("Enhancement error:", error);
      return res.status(503).json({
        error: "AI service is currently experiencing high demand. Please try again in a few seconds.",
      });
    }
  });

  // API Route: Multimodal Audio Transcription & AI Formatting
  app.post("/api/transcribe-audio", async (req, res) => {
    try {
      const { audioBase64, mimeType, projectName, tags, autoEnhance } = req.body;
      if (!audioBase64 || typeof audioBase64 !== "string") {
        return res.status(400).json({ error: "Audio data is required for transcription." });
      }

      // Extract pure base64 payload cleanly, handling any Data URL formats
      const base64Index = audioBase64.indexOf(";base64,");
      let cleanBase64 = base64Index !== -1
        ? audioBase64.substring(base64Index + 8)
        : audioBase64.replace(/^data:[^,]+,/, "");
      
      // Strip any accidental whitespace/newlines from base64
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
      return res.json({
        transcript,
        enhancedText: autoEnhance ? transcript : undefined,
      });
    } catch (error: any) {
      console.error("Audio transcription error:", error);
      return res.status(503).json({
        error: "Voice transcription is currently experiencing high demand. Please try again.",
      });
    }
  });

  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Vite integration
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Work Log server running on port ${PORT}`);
  });
}

startServer();
