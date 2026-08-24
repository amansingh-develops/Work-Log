import React, { useState } from "react";
import {
  Trash2,
  RotateCcw,
  AlertTriangle,
  Calendar,
  Layers,
  Sparkles,
} from "lucide-react";
import { useWorkLog } from "../context/WorkLogContext";
import { formatDate, formatRelativeTime } from "../lib/utils";
import { getProjectColor, WorkEntry } from "../types";

export const TrashView: React.FC = () => {
  const {
    deletedEntries,
    restoreEntry,
    permanentlyDeleteEntry,
    projectsMap,
  } = useWorkLog();

  const [confirmPermanentEntry, setConfirmPermanentEntry] = useState<WorkEntry | null>(null);

  const handleRestore = async (id: string) => {
    await restoreEntry(id);
  };

  const handlePermanentDelete = async () => {
    if (!confirmPermanentEntry) return;
    await permanentlyDeleteEntry(confirmPermanentEntry.id);
    setConfirmPermanentEntry(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-1">
            Recovery & Retention
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif italic text-gray-900 dark:text-zinc-100">
            Trash & Soft-Deleted Items
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-0.5 font-sans">
            Recover deleted work log entries or permanently remove them
          </p>
        </div>

        {deletedEntries.length > 0 && (
          <div className="px-3 py-1.5 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-semibold">
            {deletedEntries.length} {deletedEntries.length === 1 ? "item" : "items"} in trash
          </div>
        )}
      </div>

      {/* Trash Entries List */}
      {deletedEntries.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-zinc-900/40 rounded-2xl border border-dashed border-[#E5E7EB] dark:border-zinc-800 shadow-xs">
          <Trash2 className="w-10 h-10 text-gray-300 dark:text-zinc-700 mx-auto mb-3" />
          <h3 className="text-base font-serif italic text-gray-900 dark:text-zinc-100">
            Trash is empty
          </h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto font-sans">
            Soft-deleted entries will appear here. You can safely restore them anytime without losing your notes.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 font-sans">
          {deletedEntries.map((entry) => {
            const project = projectsMap.get(entry.projectId);
            const colorTheme = getProjectColor(project?.colorTag);
            const textToUse = entry.activeVersion === "enhanced" && entry.enhancedText
              ? entry.enhancedText
              : entry.rawText;

            return (
              <div
                key={entry.id}
                className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E7EB] dark:border-zinc-800 shadow-xs p-6 space-y-3"
              >
                {/* Header Row */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${colorTheme.badgeClass}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${colorTheme.dotClass}`} />
                      {project?.name || "General"}
                    </span>

                    <span className="text-xs text-gray-400 font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(entry.date)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRestore(entry.id)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl transition-colors"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Restore</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setConfirmPermanentEntry(entry)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Forever</span>
                    </button>
                  </div>
                </div>

                {/* Content */}
                <div className="text-gray-600 dark:text-zinc-400 text-xs leading-relaxed line-clamp-3 pl-1">
                  {textToUse}
                </div>

                {/* Footer Info */}
                <div className="pt-2 border-t border-[#E5E7EB] dark:border-zinc-800 flex items-center justify-between text-[11px] text-gray-400">
                  <span>Deleted {formatRelativeTime(entry.deletedAt || "")}</span>
                  {entry.tags.length > 0 && (
                    <div className="flex gap-1">
                      {entry.tags.map((t) => (
                        <span key={t}>#{t}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Permanent Delete Modal */}
      {confirmPermanentEntry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
              <AlertTriangle className="w-4 h-4" />
              <span>Permanently Delete Entry?</span>
            </div>
            <p className="text-xs text-zinc-500 leading-relaxed">
              This action cannot be undone. This entry will be permanently removed from your Firestore database and cannot be recovered.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setConfirmPermanentEntry(null)}
                className="px-3.5 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePermanentDelete}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors"
              >
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
