import React, { useState } from "react";
import { X, Sparkles, Loader2, Calendar, Tag, Folder, Check } from "lucide-react";
import { WorkEntry, Project } from "../types";
import { useWorkLog } from "../context/WorkLogContext";
import { useAuth } from "../context/AuthContext";
import { getProjectColor } from "../types";

interface EditEntryModalProps {
  entry: WorkEntry;
  onClose: () => void;
}

export const EditEntryModal: React.FC<EditEntryModalProps> = ({ entry, onClose }) => {
  const { activeProjects, updateEntry, projectsMap } = useWorkLog();
  const { profile } = useAuth();

  const [date, setDate] = useState(entry.date);
  const [projectId, setProjectId] = useState(entry.projectId);
  const [rawText, setRawText] = useState(entry.rawText);
  const [enhancedText, setEnhancedText] = useState(entry.enhancedText || "");
  const [activeVersion, setActiveVersion] = useState(entry.activeVersion);
  const [tags, setTags] = useState<string[]>(entry.tags || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  const availableTags = profile?.tagList || [];

  const toggleTag = (tag: string) => {
    if (tags.includes(tag)) {
      setTags(tags.filter((t) => t !== tag));
    } else {
      setTags([...tags, tag]);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rawText.trim() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await updateEntry(entry.id, {
        date,
        projectId,
        rawText: rawText.trim(),
        enhancedText: enhancedText.trim() ? enhancedText.trim() : null,
        activeVersion,
        tags,
      });
      setIsSaved(true);
      setTimeout(() => {
        onClose();
      }, 600);
    } catch (err) {
      console.error("Failed to update entry:", err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="edit-entry-modal"
        className="w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex-shrink-0">
          <div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
              Edit Work Log Entry
            </h3>
            <p className="text-xs text-zinc-500">
              Update project, date, tags, or fine-tune content
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSave} className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Metadata Grid: Project + Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Folder className="w-3.5 h-3.5 text-zinc-400" />
                Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10"
              >
                {activeProjects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10"
              />
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-zinc-400" />
              Tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {availableTags.map((tag) => {
                const isSelected = tags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                      isSelected
                        ? "bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                    }`}
                  >
                    #{tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Version Selector */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/40 rounded-xl border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
              Active Version in Exports & Views
            </span>
            <div className="inline-flex rounded-lg bg-zinc-200/70 dark:bg-zinc-700/70 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setActiveVersion("raw")}
                className={`px-2.5 py-1 rounded-md transition-colors ${
                  activeVersion === "raw"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400"
                }`}
              >
                Raw Text
              </button>
              <button
                type="button"
                onClick={() => setActiveVersion("enhanced")}
                disabled={!enhancedText}
                className={`px-2.5 py-1 rounded-md transition-colors flex items-center gap-1 ${
                  activeVersion === "enhanced"
                    ? "bg-white dark:bg-zinc-800 text-purple-700 dark:text-purple-300 font-medium shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 disabled:opacity-40"
                }`}
              >
                <Sparkles className="w-3 h-3 text-purple-600" />
                AI Enhanced
              </button>
            </div>
          </div>

          {/* Raw Text Box */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Raw Text / Voice Transcript
            </label>
            <textarea
              rows={4}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              className="w-full p-3 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 font-mono text-xs leading-relaxed"
            />
          </div>

          {/* Enhanced Text Box */}
          <div>
            <label className="block text-xs font-medium text-purple-800 dark:text-purple-300 mb-1.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-purple-600" />
              AI Enhanced Text (Formatted Bullets)
            </label>
            <textarea
              rows={4}
              value={enhancedText}
              onChange={(e) => setEnhancedText(e.target.value)}
              placeholder="Enhanced bullet points..."
              className="w-full p-3 text-sm bg-purple-50/20 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-800/60 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 text-xs leading-relaxed"
            />
          </div>

          {/* Submit Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || isSaved || !rawText.trim()}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl shadow-xs transition-all disabled:opacity-50 ${
                isSaved
                  ? "bg-emerald-600 dark:bg-emerald-500 text-white font-bold"
                  : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white"
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white animate-in zoom-in" />
                  <span>Saved!</span>
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
