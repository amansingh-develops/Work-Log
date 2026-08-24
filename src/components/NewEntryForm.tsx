import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Send,
  Calendar,
  Folder,
  Tag,
  Plus,
  Loader2,
  Check,
  Zap,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useWorkLog } from "../context/WorkLogContext";
import { useAuth } from "../context/AuthContext";
import { getTodayString, getYesterdayString, formatDate } from "../lib/utils";
import { VoiceRecorder } from "./VoiceRecorder";
import { ProjectModal } from "./ProjectModal";

interface NewEntryFormProps {
  onSuccess?: () => void;
}

export const NewEntryForm: React.FC<NewEntryFormProps> = ({ onSuccess }) => {
  const {
    activeProjects,
    projectsMap,
    lastUsedProjectId,
    setLastUsedProjectId,
    createEntry,
  } = useWorkLog();
  const { profile, addCustomTag } = useAuth();

  const [text, setText] = useState("");
  const [projectId, setProjectId] = useState<string>(lastUsedProjectId);
  const [date, setDate] = useState<string>(getTodayString());
  const [tags, setTags] = useState<string[]>([]);
  const [enhanceWithAi, setEnhanceWithAi] = useState<boolean>(
    profile?.defaultEnhanceOn || false
  );
  const [source, setSource] = useState<"voice" | "text">("text");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  // Sync default enhancement from profile if changed
  useEffect(() => {
    if (profile?.defaultEnhanceOn !== undefined) {
      setEnhanceWithAi(profile.defaultEnhanceOn);
    }
  }, [profile?.defaultEnhanceOn]);

  // Keep projectId in sync with activeProjects
  useEffect(() => {
    if (lastUsedProjectId && activeProjects.some((p) => p.id === lastUsedProjectId)) {
      setProjectId(lastUsedProjectId);
    } else if (activeProjects.length > 0 && (!projectId || !activeProjects.some((p) => p.id === projectId))) {
      setProjectId(activeProjects[0].id);
    }
  }, [lastUsedProjectId, activeProjects, projectId]);

  const handleVoiceTranscript = (transcript: string, enhanced?: string) => {
    setText(transcript);
    setSource("voice");
    setSubmitError(null);
  };

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const handleAddNewTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagInput.trim()) return;
    const clean = newTagInput.trim().toLowerCase().replace(/^#/, "");
    await addCustomTag(clean);
    if (!tags.includes(clean)) {
      setTags([...tags, clean]);
    }
    setNewTagInput("");
    setShowTagInput(false);
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!text.trim() || isSubmitting) {
      if (!text.trim()) {
        setSubmitError("Please enter some text or record a voice note.");
      }
      return;
    }

    setSubmitError(null);
    setSubmitSuccess(null);
    setIsSubmitting(true);
    setIsSaved(false);

    try {
      const currentProjId = projectId || (activeProjects[0]?.id ?? "");
      await createEntry({
        projectId: currentProjId,
        date,
        text: text.trim(),
        tags,
        source,
        enhanceWithAi,
      });

      // Clear input and trigger saved tick animation
      setText("");
      setSource("text");
      setIsSaved(true);
      setSubmitSuccess("Entry logged and synchronized!");

      setTimeout(() => {
        setIsSaved(false);
        setSubmitSuccess(null);
      }, 2500);

      if (onSuccess) onSuccess();
    } catch (err: any) {
      console.error("Failed to create work entry:", err);
      setSubmitError(err?.message || "Failed to save entry. Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Cmd+Enter / Ctrl+Enter shortcut
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  };

  const availableTags = profile?.tagList || [];
  const selectedProject = projectsMap.get(projectId);

  return (
    <>
      <div
        id="new-entry-card"
        className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E7EB] dark:border-zinc-800 shadow-xs p-6 sm:p-7"
      >
        {/* Editorial Section Prompt */}
        <div className="mb-5">
          <div className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-1">
            Quick Log
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif italic text-gray-900 dark:text-zinc-100">
            What did you achieve today?
          </h2>
        </div>

        {/* Controls: Project, Date Presets */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-[#E5E7EB] dark:border-zinc-800">
          {/* Project Selector */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-zinc-400">
              <Folder className="w-3.5 h-3.5" />
              <span>Project:</span>
            </div>
            {activeProjects.length > 0 ? (
              <select
                id="entry-project-select"
                value={projectId}
                onChange={(e) => {
                  setProjectId(e.target.value);
                  setLastUsedProjectId(e.target.value);
                }}
                className="px-3 py-1.5 text-xs font-semibold bg-[#F9FAFB] dark:bg-zinc-800 border border-[#E5E7EB] dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-black dark:focus:ring-white cursor-pointer"
              >
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            ) : (
              <button
                type="button"
                onClick={() => setIsNewProjectModalOpen(true)}
                className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Create first project
              </button>
            )}
            <button
              type="button"
              onClick={() => setIsNewProjectModalOpen(true)}
              title="Add new project"
              className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-[#F3F4F6] dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Date Picker & Quick Date Chips */}
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg bg-[#F3F4F6] dark:bg-zinc-800 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setDate(getTodayString())}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  date === getTodayString()
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
              >
                Today
              </button>
              <button
                type="button"
                onClick={() => setDate(getYesterdayString())}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  date === getYesterdayString()
                    ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900"
                }`}
              >
                Yesterday
              </button>
            </div>

            <div className="relative">
              <input
                type="date"
                id="entry-date-picker"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="px-2.5 py-1 text-xs bg-[#F9FAFB] dark:bg-zinc-800 border border-[#E5E7EB] dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Voice Dictation Bar (With Gemini Multimodal Audio Transcription) */}
        <div className="mb-3">
          <VoiceRecorder
            currentText={text}
            onTranscriptChange={handleVoiceTranscript}
            projectName={selectedProject?.name}
            tags={tags}
            autoEnhance={enhanceWithAi}
          />
        </div>

        {/* Text Area */}
        <div className="relative">
          <textarea
            id="entry-text-input"
            rows={4}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSubmitError(null);
              if (source === "voice" && e.target.value !== text) {
                setSource("text");
              }
            }}
            onKeyDown={handleKeyDown}
            placeholder="Type your notes or speak via microphone... (e.g., solved OAuth token refreshing race condition, reviewed PR #42 with mentor, tested edge cases with 5 mock sessions)"
            className="w-full p-4 text-sm bg-[#FAFAFA] dark:bg-zinc-800/40 border border-[#E5E7EB] dark:border-zinc-800 rounded-2xl text-zinc-900 dark:text-zinc-100 placeholder:text-gray-400 focus:outline-hidden focus:ring-1 focus:ring-black dark:focus:ring-white leading-relaxed font-sans transition-all resize-y min-h-[110px]"
          />
        </div>

        {/* Tag Selector Chips */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-gray-400 dark:text-zinc-500 font-semibold flex items-center gap-1 mr-1 uppercase text-[10px] tracking-wider">
            <Tag className="w-3 h-3" />
            Tags:
          </span>

          {availableTags.map((tag) => {
            const isSelected = tags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => toggleTag(tag)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  isSelected
                    ? "bg-black text-white dark:bg-white dark:text-black shadow-xs"
                    : "bg-[#F3F4F6] dark:bg-zinc-800/80 text-zinc-600 dark:text-zinc-400 hover:bg-[#E5E7EB] dark:hover:bg-zinc-700"
                }`}
              >
                #{tag}
              </button>
            );
          })}

          {showTagInput ? (
            <form onSubmit={handleAddNewTag} className="inline-flex items-center gap-1">
              <input
                type="text"
                value={newTagInput}
                onChange={(e) => setNewTagInput(e.target.value)}
                placeholder="tag name..."
                autoFocus
                className="px-2 py-0.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-600 rounded-md w-24 focus:outline-hidden"
              />
              <button
                type="submit"
                className="px-2 py-0.5 text-xs bg-black text-white dark:bg-white dark:text-black rounded-md font-semibold"
              >
                Add
              </button>
              <button
                type="button"
                onClick={() => setShowTagInput(false)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowTagInput(true)}
              className="px-2 py-1 rounded-lg text-xs text-gray-400 hover:text-gray-800 dark:hover:text-zinc-200 hover:bg-[#F3F4F6] dark:hover:bg-zinc-800 transition-colors flex items-center gap-0.5 cursor-pointer"
            >
              <Plus className="w-3 h-3" />
              <span>custom tag</span>
            </button>
          )}
        </div>

        {/* Feedback messages */}
        {submitError && (
          <div className="mt-3 p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{submitError}</span>
          </div>
        )}

        {submitSuccess && (
          <div className="mt-3 p-3 text-xs bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 rounded-xl border border-emerald-200 dark:border-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{submitSuccess}</span>
          </div>
        )}

        {/* Bottom Bar: AI Toggle & Save Button */}
        <div className="mt-5 pt-4 border-t border-[#E5E7EB] dark:border-zinc-800 flex flex-wrap items-center justify-between gap-3">
          {/* AI Enhancement Toggle */}
          <label className="flex items-center gap-2.5 cursor-pointer group select-none">
            <div className="relative inline-flex items-center">
              <input
                type="checkbox"
                id="ai-enhancement-checkbox"
                checked={enhanceWithAi}
                onChange={(e) => setEnhanceWithAi(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-200 peer-focus:outline-hidden rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-purple-600"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-purple-600" />
                AI Text Clean & Bullets
              </span>
              <span className="text-[11px] text-gray-400">
                {enhanceWithAi
                  ? "Formats with action verbs into concise bullet points"
                  : "Saves raw transcript text as-is without API call"}
              </span>
            </div>
          </label>

          {/* Submit Button */}
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline text-[11px] text-gray-400">
              <kbd className="px-1.5 py-0.5 text-[10px] bg-[#F3F4F6] dark:bg-zinc-800 rounded border border-[#E5E7EB] dark:border-zinc-700 font-mono">
                ⌘/Ctrl + Enter
              </kbd>
            </span>

            <button
              type="button"
              id="save-entry-btn"
              onClick={() => handleSubmit()}
              disabled={isSubmitting || isSaved || !text.trim()}
              className={`flex items-center gap-2 px-5 py-2.5 text-xs font-semibold rounded-xl shadow-sm transition-all cursor-pointer ${
                isSaved
                  ? "bg-emerald-600 dark:bg-emerald-500 text-white scale-[1.02]"
                  : isSubmitting
                  ? "bg-zinc-800 dark:bg-zinc-200 text-white dark:text-black opacity-90 cursor-wait"
                  : "bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-zinc-100 hover:translate-y-[-1px] active:translate-y-[0px] disabled:opacity-40 disabled:cursor-not-allowed"
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-4 h-4 text-white animate-in zoom-in-50 duration-200" strokeWidth={3} />
                  <span className="font-bold">Entry Saved!</span>
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>{enhanceWithAi ? "Enhancing with AI..." : "Saving..."}</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Log Entry</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* New Project Modal */}
      {isNewProjectModalOpen && (
        <ProjectModal
          onClose={() => setIsNewProjectModalOpen(false)}
        />
      )}
    </>
  );
};
