import { GoogleGenAI } from "@google/genai";

export const getAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in environment.");
  }
  return new GoogleGenAI({
    apiKey,
  });
};

export const generateWithFallback = async (
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
          break;
        }

        const delay = (attempt + 1) * 600;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    console.warn(`Failing over from ${model} to next candidate model...`);
  }

  throw lastError || new Error("All Gemini models are currently busy. Please try again in a few moments.");
};
