export interface EnhanceRequest {
  text: string;
  projectName?: string;
  tags?: string[];
}

export interface EnhanceResponse {
  enhancedText: string;
  error?: string;
}

export interface TranscribeAudioRequest {
  audioBase64: string;
  mimeType?: string;
  projectName?: string;
  tags?: string[];
  autoEnhance?: boolean;
}

export interface TranscribeAudioResponse {
  transcript: string;
  enhancedText?: string;
  error?: string;
}

export async function enhanceWorkLogText(data: EnhanceRequest): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch("/api/enhance", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `AI enhancement failed with status ${response.status}`);
    }

    const result: EnhanceResponse = await response.json();
    return result.enhancedText;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("AI enhancement request timed out. Saving raw text instead.");
    }
    throw err;
  }
}

export async function transcribeAudioWithGemini(
  data: TranscribeAudioRequest
): Promise<{ transcript: string; enhancedText?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch("/api/transcribe-audio", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Audio transcription failed with status ${response.status}`);
    }

    const result: TranscribeAudioResponse = await response.json();
    return {
      transcript: result.transcript,
      enhancedText: result.enhancedText,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Audio transcription request timed out. Please try again.");
    }
    throw err;
  }
}
