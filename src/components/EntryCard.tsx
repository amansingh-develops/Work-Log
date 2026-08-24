import React, { useState } from "react";
import {
  Sparkles,
  Calendar,
  Tag,
  Mic,
  FileText,
  CheckSquare,
  MoreVertical,
  Edit2,
  Trash2,
  ExternalLink,
  Check,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { WorkEntry, Project, getProjectColor } from "../types";
import { useWorkLog } from "../context/WorkLogContext";
import { formatDate, formatRelativeTime } from "../lib/utils";
import { ScheduleTaskModal } from "./ScheduleTaskModal";
import { EditEntryModal } from "./EditEntryModal";

interface EntryCardProps {
  entry: WorkEntry;
}

export const EntryCard: React.FC<EntryCardProps> = ({ entry }) => {
  const {
    projectsMap,
    toggleActiveVersion,
    enhanceEntry,
    softDeleteEntry,
  } = useWorkLog();

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [enhanceError, setEnhanceError] = useState<string | null>(null);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const project = projectsMap.get(entry.projectId);
  const colorTheme = getProjectColor(project?.colorTag);

  const isEnhancedActive = entry.activeVersion === "enhanced" && entry.enhancedText;
  const displayText = isEnhancedActive ? entry.enhancedText! : entry.rawText;

  const handleEnhanceClick = async () => {
    setIsEnhancing(true);
    setEnhanceError(null);
    try {
      await enhanceEntry(entry.id);
    } catch (err: any) {
      console.error("Enhance failed:", err);
      setEnhanceError(
        err?.message || "AI is currently experiencing high demand. Please retry in a few seconds."
      );
      setTimeout(() => setEnhanceError(null), 5000);
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleDelete = async () => {
    setShowMenu(false);
    await softDeleteEntry(entry.id);
  };

  return (
    <>
      <div
        id={`entry-card-${entry.id}`}
        className="group relative bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E7EB] dark:border-zinc-800 shadow-xs hover:shadow-sm hover:border-gray-300 dark:hover:border-zinc-700 transition-all p-6"
      >
        {/* Card Top Row: Project Badge, Date, Source, Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            {/* Project Badge */}
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${colorTheme.badgeClass}`}
            >
              <span className={`w-2 h-2 rounded-full ${colorTheme.dotClass}`} />
              {project?.name || "General Work"}
            </span>

            {/* Date Tag */}
            <span className="text-[10px] font-bold text-gray-500 dark:text-zinc-400 bg-[#F3F4F6] dark:bg-zinc-800 px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-gray-400" />
              {formatDate(entry.date)}
            </span>

            {/* Voice or Text Source Badge */}
            <span
              title={entry.source === "voice" ? "Recorded via Voice Note" : "Typed directly"}
              className="p-1 rounded-md text-gray-400 bg-[#F3F4F6] dark:bg-zinc-800 text-[10px]"
            >
              {entry.source === "voice" ? (
                <Mic className="w-3 h-3 text-rose-500" />
              ) : (
                <FileText className="w-3 h-3 text-gray-500" />
              )}
            </span>
          </div>

          {/* Right Action Switchers */}
          <div className="flex items-center gap-1.5">
            {/* Raw vs Enhanced Switcher */}
            {entry.enhancedText ? (
              <button
                type="button"
                onClick={() => toggleActiveVersion(entry.id)}
                title="Toggle between AI enhanced and raw text"
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  entry.activeVersion === "enhanced"
                    ? "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800"
                    : "bg-[#F3F4F6] text-zinc-600 border border-[#E5E7EB] dark:bg-zinc-800 dark:text-zinc-400 dark:border-zinc-700"
                }`}
              >
                <Sparkles className="w-3 h-3 text-purple-600" />
                <span>{entry.activeVersion === "enhanced" ? "AI Enhanced" : "Raw Text"}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleEnhanceClick}
                disabled={isEnhancing}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-purple-700 dark:text-purple-300 bg-purple-50 hover:bg-purple-100 dark:bg-purple-950/40 dark:hover:bg-purple-900/40 border border-purple-200 dark:border-purple-800 transition-colors"
              >
                {isEnhancing ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin text-purple-600" />
                    <span>Cleaning...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3 h-3 text-purple-600" />
                    <span>Enhance with AI</span>
                  </>
                )}
              </button>
            )}

            {/* Menu Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMenu(!showMenu)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-900 dark:hover:text-zinc-100 hover:bg-[#F3F4F6] dark:hover:bg-zinc-800 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {showMenu && (
                <>
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 mt-1 w-44 bg-white dark:bg-zinc-800 rounded-xl shadow-lg border border-[#E5E7EB] dark:border-zinc-700 py-1 z-30 animate-in fade-in zoom-in-95 duration-100 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setIsEditOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 text-zinc-700 dark:text-zinc-200 hover:bg-[#F9FAFB] dark:hover:bg-zinc-700/50 flex items-center gap-2"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-zinc-400" />
                      <span>Edit Entry</span>
                    </button>
                    {entry.enhancedText && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowMenu(false);
                          handleEnhanceClick();
                        }}
                        className="w-full text-left px-3 py-2 text-purple-700 dark:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-950/30 flex items-center gap-2"
                      >
                        <Sparkles className="w-3.5 h-3.5 text-purple-500" />
                        <span>Re-run AI Enhance</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowMenu(false);
                        setIsScheduleOpen(true);
                      }}
                      className="w-full text-left px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 flex items-center gap-2"
                    >
                      <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                      <span>Schedule Google Task</span>
                    </button>
                    <div className="my-1 border-t border-[#E5E7EB] dark:border-zinc-700" />
                    <button
                      type="button"
                      onClick={handleDelete}
                      className="w-full text-left px-3 py-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                      <span>Move to Trash</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Enhancement Error Notice */}
        {enhanceError && (
          <div className="mb-3 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between gap-2 animate-in fade-in duration-150">
            <div className="flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
              <span>{enhanceError}</span>
            </div>
            <button
              type="button"
              onClick={() => setEnhanceError(null)}
              className="text-amber-700 dark:text-amber-400 hover:text-amber-900 text-[11px] underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Content / Bullets */}
        <div className="text-gray-900 dark:text-zinc-100 text-sm leading-relaxed whitespace-pre-line py-1 font-sans">
          {displayText.split("\n").map((line, idx) => {
            const isBullet = line.trim().startsWith("-") || line.trim().startsWith("•");
            return (
              <div
                key={idx}
                className={`py-0.5 ${
                  isBullet ? "pl-2 flex items-start gap-2" : ""
                }`}
              >
                {isBullet && (
                  <span className="text-gray-400 select-none">•</span>
                )}
                <span>
                  {isBullet
                    ? line.replace(/^[-•*]\s*/, "")
                    : line}
                </span>
              </div>
            );
          })}
        </div>

        {/* Bottom Metadata & Follow-up Task Banner */}
        <div className="mt-4 pt-3 border-t border-[#E5E7EB] dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2 text-xs">
          {/* Tags */}
          <div className="flex flex-wrap items-center gap-1.5">
            {entry.tags && entry.tags.length > 0 ? (
              entry.tags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-md bg-[#F3F4F6] dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold text-[11px]"
                >
                  #{tag}
                </span>
              ))
            ) : (
              <span className="text-gray-400 text-[11px]">No tags</span>
            )}
          </div>

          {/* Schedule Task Action / Status */}
          <div className="flex items-center gap-2">
            {entry.scheduledTaskId ? (
              <div
                title="Linked follow-up scheduled in Google Tasks"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-[11px] font-semibold"
              >
                <Check className="w-3 h-3 text-emerald-600" />
                <span>Task: {entry.scheduledTaskTitle || "Scheduled"}</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsScheduleOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-gray-500 dark:text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
              >
                <CheckSquare className="w-3.5 h-3.5 text-gray-400 group-hover:text-blue-500" />
                <span>Schedule follow-up</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {isScheduleOpen && (
        <ScheduleTaskModal
          entry={entry}
          project={project}
          onClose={() => setIsScheduleOpen(false)}
        />
      )}

      {isEditOpen && (
        <EditEntryModal entry={entry} onClose={() => setIsEditOpen(false)} />
      )}
    </>
  );
};
