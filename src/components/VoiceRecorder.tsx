import React, { useState, useEffect, useRef } from "react";
import {
  Mic,
  MicOff,
  AlertCircle,
  Sparkles,
  Loader2,
  Square,
  Volume2,
  Radio,
  CheckCircle2,
} from "lucide-react";
import { transcribeAudioWithGemini } from "../services/api";

interface VoiceRecorderProps {
  onTranscriptChange: (transcript: string, enhanced?: string) => void;
  currentText: string;
  projectName?: string;
  tags?: string[];
  autoEnhance?: boolean;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({
  onTranscriptChange,
  currentText,
  projectName,
  tags,
  autoEnhance = false,
}) => {
  // Mode: "gemini_audio" (MediaRecorder -> Gemini 3.7 Flash) or "live_speech" (Web Speech API)
  const [engineMode, setEngineMode] = useState<"gemini_audio" | "live_speech">("gemini_audio");
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [liveInterim, setLiveInterim] = useState("");

  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<any>(null);
  const recognitionRef = useRef<any>(null);
  const currentTextRef = useRef(currentText);

  // Keep currentTextRef synchronized without re-triggering effects
  useEffect(() => {
    currentTextRef.current = currentText;
  }, [currentText]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Initialize SpeechRecognition once for live dictation
  const initSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) return null;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsRecording(true);
        setErrorMessage(null);
        setSuccessMessage(null);
      };

      recognition.onresult = (event: any) => {
        let finalChunk = "";
        let interimChunk = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalChunk += trans + " ";
          } else {
            interimChunk += trans;
          }
        }

        if (finalChunk.trim()) {
          const prev = currentTextRef.current.trim();
          const combined = prev ? `${prev}\n- ${finalChunk.trim()}` : `- ${finalChunk.trim()}`;
          onTranscriptChange(combined);
          setLiveInterim("");
        } else {
          setLiveInterim(interimChunk);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn("Live speech recognition event:", event.error);
        if (event.error === "not-allowed") {
          setErrorMessage("Microphone access was denied. Please allow microphone permissions.");
        } else if (event.error !== "no-speech") {
          setErrorMessage(`Live speech notice: ${event.error}`);
        }
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
        setLiveInterim("");
      };

      return recognition;
    } catch (e) {
      console.error("SpeechRecognition init error:", e);
      return null;
    }
  };

  // Start Gemini Audio Recording (High-Fidelity MediaRecorder)
  const startGeminiAudioRecording = async () => {
    try {
      setErrorMessage(null);
      setSuccessMessage(null);
      audioChunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Determine supported MIME type
      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = "audio/webm";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "audio/mp4";
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = "";
          }
        }
      }

      const mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

        const recordedBlob = new Blob(audioChunksRef.current, {
          type: mediaRecorder.mimeType || "audio/webm",
        });

        if (recordedBlob.size < 100) {
          setIsProcessing(false);
          setIsRecording(false);
          return;
        }

        setIsProcessing(true);
        try {
          // Convert Blob to base64
          const reader = new FileReader();
          reader.readAsDataURL(recordedBlob);
          reader.onloadend = async () => {
            const base64Audio = reader.result as string;
            try {
              const cleanMime = (recordedBlob.type || "audio/webm").split(";")[0];
              const res = await transcribeAudioWithGemini({
                audioBase64: base64Audio,
                mimeType: cleanMime,
                projectName,
                tags,
                autoEnhance,
              });

              if (res.transcript) {
                const prev = currentTextRef.current.trim();
                const newText = prev ? `${prev}\n\n${res.transcript}` : res.transcript;
                onTranscriptChange(newText, res.enhancedText);
                setSuccessMessage("Transcribed & structured accurately with Gemini AI!");
                setTimeout(() => setSuccessMessage(null), 4000);
              }
            } catch (err: any) {
              console.error("Gemini audio transcription failed:", err);
              setErrorMessage(err.message || "Failed to transcribe audio. Please try again.");
            } finally {
              setIsProcessing(false);
              setIsRecording(false);
            }
          };
        } catch (err: any) {
          console.error("Audio processing error:", err);
          setErrorMessage("Failed to process audio.");
          setIsProcessing(false);
          setIsRecording(false);
        }
      };

      mediaRecorder.start(250); // Slice every 250ms
      setIsRecording(true);
      setRecordingSeconds(0);

      // Start 1-second interval timer (max 60 seconds)
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => {
          if (prev >= 60) {
            // Auto stop after 60s
            stopRecording();
            return 60;
          }
          return prev + 1;
        });
      }, 1000);
    } catch (err: any) {
      console.error("getUserMedia error:", err);
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        setErrorMessage("Microphone access denied. Please click the camera/mic icon in the browser address bar to allow.");
      } else {
        setErrorMessage(`Could not start microphone: ${err.message || "Unknown error"}`);
      }
      setIsRecording(false);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);

    if (engineMode === "gemini_audio") {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsRecording(false);
    }
  };

  // Toggle button handler
  const handleToggleRecord = () => {
    if (isRecording) {
      stopRecording();
    } else {
      if (engineMode === "gemini_audio") {
        startGeminiAudioRecording();
      } else {
        if (!recognitionRef.current) {
          recognitionRef.current = initSpeechRecognition();
        }
        if (recognitionRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.warn("Recognition start retry:", e);
            recognitionRef.current = initSpeechRecognition();
            recognitionRef.current?.start();
          }
        } else {
          setErrorMessage("Live speech is not supported in this browser. Switched to Gemini AI Audio mode.");
          setEngineMode("gemini_audio");
          startGeminiAudioRecording();
        }
      }
    }
  };

  // Format seconds to M:SS
  const formatTimer = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = sec % 60;
    return `${mins}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div className="flex flex-col gap-2 p-3 bg-[#F9FAFB] dark:bg-zinc-850/60 rounded-xl border border-[#E5E7EB] dark:border-zinc-800">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        {/* Recording Action Button & Visualizer */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            id="voice-recorder-main-btn"
            onClick={handleToggleRecord}
            disabled={isProcessing}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer ${
              isRecording
                ? "bg-rose-600 text-white hover:bg-rose-700 ring-4 ring-rose-500/20"
                : "bg-white dark:bg-zinc-800 text-gray-900 dark:text-zinc-100 border border-[#E5E7EB] dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-750"
            } disabled:opacity-50`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-600" />
                <span>AI Transcribing...</span>
              </>
            ) : isRecording ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Stop & Transcribe ({formatTimer(recordingSeconds)})</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-rose-500" />
                <span>Record Voice Note</span>
              </>
            )}
          </button>

          {/* Engine Mode Toggle */}
          <div className="inline-flex rounded-lg bg-gray-200 dark:bg-zinc-800 p-0.5 text-[11px] font-medium">
            <button
              type="button"
              onClick={() => {
                if (!isRecording) setEngineMode("gemini_audio");
              }}
              disabled={isRecording}
              className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                engineMode === "gemini_audio"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 font-semibold shadow-xs"
                  : "text-gray-500 dark:text-zinc-400 hover:text-gray-900"
              }`}
              title="Record high-fidelity audio, transcribed accurately with Gemini 3.7 AI"
            >
              <Sparkles className="w-3 h-3 text-purple-600" />
              <span>Gemini AI (Accurate)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                if (!isRecording) setEngineMode("live_speech");
              }}
              disabled={isRecording}
              className={`px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
                engineMode === "live_speech"
                  ? "bg-white dark:bg-zinc-700 text-gray-900 dark:text-zinc-100 font-semibold shadow-xs"
                  : "text-gray-500 dark:text-zinc-400 hover:text-gray-900"
              }`}
              title="Browser live speech-to-text dictation"
            >
              <Radio className="w-3 h-3 text-blue-500" />
              <span>Live Dictation</span>
            </button>
          </div>
        </div>

        {/* Live Audio Status */}
        {isRecording && (
          <div className="flex items-center gap-2 text-xs font-semibold text-rose-600 dark:text-rose-400">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-4 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
              <span className="w-1.5 h-6 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
              <span className="w-1.5 h-3 bg-rose-500 rounded-full animate-bounce [animation-delay:-0.4s]"></span>
              <span className="w-1.5 h-5 bg-rose-500 rounded-full animate-bounce"></span>
            </div>
            <span>Listening... ({60 - recordingSeconds}s remaining)</span>
          </div>
        )}
      </div>

      {/* Live Interim Transcript Bubble */}
      {liveInterim && (
        <div className="text-xs text-zinc-600 dark:text-zinc-300 italic px-3 py-1.5 bg-white dark:bg-zinc-800 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-700">
          Listening: "{liveInterim}"
        </div>
      )}

      {/* Processing indicator */}
      {isProcessing && (
        <div className="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300 font-medium px-2 py-1 bg-purple-50 dark:bg-purple-950/40 rounded-lg border border-purple-200 dark:border-purple-800">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Gemini 3.7 Flash is analyzing audio, transcribing technical terms, and structuring your notes...</span>
        </div>
      )}

      {/* Success banner */}
      {successMessage && (
        <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-300 font-medium px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 rounded-lg border border-emerald-200 dark:border-emerald-800">
          <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="flex items-center gap-2 text-xs text-rose-700 dark:text-rose-300 font-medium px-2 py-1 bg-rose-50 dark:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-800">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
