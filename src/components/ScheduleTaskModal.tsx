import React, { useState } from "react";
import { X, Calendar, CheckSquare, Sparkles, AlertCircle, Loader2, Check } from "lucide-react";
import { WorkEntry, Project } from "../types";
import { useWorkLog } from "../context/WorkLogContext";
import { useAuth } from "../context/AuthContext";
import { formatDate, getTodayString } from "../lib/utils";

interface ScheduleTaskModalProps {
  entry: WorkEntry;
  project?: Project;
  onClose: () => void;
}

export const ScheduleTaskModal: React.FC<ScheduleTaskModalProps> = ({
  entry,
  project,
  onClose,
}) => {
  const { scheduleFollowUp } = useWorkLog();
  const { tasksAuthorized, requestTasksAccess } = useAuth();

  // Suggest initial task title from first line of entry
  const initialTitle = (() => {
    const text = entry.activeVersion === "enhanced" && entry.enhancedText
      ? entry.enhancedText
      : entry.rawText;
    const firstLine = text.split("\n").find((l) => l.trim().length > 0) || "";
    const clean = firstLine.replace(/^[-•*#\s]+/, "").trim();
    return clean ? `Follow-up: ${clean.slice(0, 60)}` : `Follow-up on ${project?.name || "Task"}`;
  })();

  // Default due date: tomorrow
  const defaultDueDate = (() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  })();

  const [title, setTitle] = useState(initialTitle);
  const [dueDate, setDueDate] = useState(defaultDueDate);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScheduled, setIsScheduled] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await requestTasksAccess();
    } catch (err: any) {
      setError(err?.message || "Failed to connect Google account. You can still save as a local follow-up.");
    } finally {
      setIsConnecting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, forceLocal = false) => {
    e.preventDefault();
    if (!title.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      await scheduleFollowUp(entry.id, title, dueDate || undefined, forceLocal);
      setIsScheduled(true);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error("Error creating Google Task:", err);
      setError(
        err?.message || "Failed to schedule with Google Tasks. Click 'Save as Local Follow-Up' below to link it without Google API."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="schedule-task-modal"
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <CheckSquare className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                Schedule Follow-Up Task
              </h3>
              <p className="text-xs text-zinc-500">
                Create a linked task with reminder due date
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={(e) => handleSubmit(e, !tasksAuthorized)} className="p-6 space-y-4">
          {!tasksAuthorized && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-800 dark:text-amber-200 flex flex-col gap-2">
              <div className="flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
                <span>Google Tasks not connected</span>
              </div>
              <p className="text-[11px] text-amber-700 dark:text-amber-300">
                You can connect your Google Account for cloud sync, or save directly as a local linked task follow-up.
              </p>
              <button
                type="button"
                onClick={handleConnect}
                disabled={isConnecting}
                className="self-start px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors flex items-center gap-1.5 text-xs"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <span>Connect Google Account</span>
                )}
              </button>
            </div>
          )}

          {/* Project & Entry context info */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-800/60 rounded-xl border border-zinc-200/60 dark:border-zinc-700/60 text-xs">
            <span className="text-zinc-400">Context: </span>
            <span className="font-semibold text-zinc-700 dark:text-zinc-200">
              {project?.name || "General"}
            </span>
            <span className="text-zinc-400"> • Logged on: </span>
            <span className="text-zinc-700 dark:text-zinc-200">{formatDate(entry.date)}</span>
          </div>

          {/* Task Title */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="google-task-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Review PR #104 and deploy migration"
              required
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {/* Due Date */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-400" />
              Due Date
            </label>
            <input
              type="date"
              id="google-task-due-date-input"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>

          {error && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-xl text-xs text-rose-700 dark:text-rose-300 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="self-start underline font-semibold text-rose-800 dark:text-rose-200"
              >
                Save as Local Linked Task instead
              </button>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="google-task-submit-btn"
              disabled={isSubmitting || isScheduled || !title.trim()}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl shadow-xs transition-all ${
                isScheduled
                  ? "bg-emerald-600 text-white font-bold"
                  : "bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
              }`}
            >
              {isScheduled ? (
                <>
                  <Check className="w-4 h-4 text-white animate-in zoom-in" />
                  <span>Scheduled!</span>
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Task...</span>
                </>
              ) : (
                <>
                  <CheckSquare className="w-3.5 h-3.5" />
                  <span>{tasksAuthorized ? "Add to Google Tasks" : "Save Follow-Up Task"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
