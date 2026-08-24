import React from "react";
import {
  Sparkles,
  Calendar,
  Layers,
  Clock,
  ArrowRight,
  PlusCircle,
  FolderKanban,
  CheckCircle2,
} from "lucide-react";
import { useWorkLog } from "../context/WorkLogContext";
import { useAuth } from "../context/AuthContext";
import { getTodayString, formatDate } from "../lib/utils";
import { NewEntryForm } from "../components/NewEntryForm";
import { EntryCard } from "../components/EntryCard";
import { NavTab } from "../components/Navbar";

interface TodayViewProps {
  onNavigate: (tab: NavTab) => void;
}

export const TodayView: React.FC<TodayViewProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const { activeEntries, activeProjects } = useWorkLog();

  const todayStr = getTodayString();
  const todayEntries = activeEntries.filter((e) => e.date === todayStr);

  const distinctProjectsToday = new Set(todayEntries.map((e) => e.projectId)).size;
  const enhancedCount = todayEntries.filter((e) => e.activeVersion === "enhanced").length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Welcome & Daily Metrics Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-1">
            Personal Journal
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif italic text-gray-900 dark:text-zinc-100">
            {user?.displayName ? `Welcome back, ${user.displayName.split(" ")[0]}` : "Daily Work Log"}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-1 font-sans">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>

        {/* Quick Day Stats */}
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-zinc-900 rounded-xl border border-[#E5E7EB] dark:border-zinc-800 shadow-xs text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-bold text-gray-900 dark:text-zinc-100">
              {todayEntries.length}
            </span>
            <span className="text-gray-400">
              {todayEntries.length === 1 ? "entry today" : "entries today"}
            </span>
          </div>

          <div className="flex items-center gap-2 px-3.5 py-2 bg-white dark:bg-zinc-900 rounded-xl border border-[#E5E7EB] dark:border-zinc-800 shadow-xs text-xs">
            <span className="w-2 h-2 rounded-full bg-purple-500"></span>
            <span className="font-bold text-gray-900 dark:text-zinc-100">
              {distinctProjectsToday}
            </span>
            <span className="text-gray-400">
              {distinctProjectsToday === 1 ? "project" : "projects"}
            </span>
          </div>
        </div>
      </div>

      {/* Main Action: New Entry Logging Box */}
      <NewEntryForm />

      {/* Today's Stream Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] dark:border-zinc-800 pb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-serif italic text-gray-900 dark:text-zinc-100">
              Today's Entries ({todayEntries.length})
            </h2>
            {enhancedCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
                {enhancedCount} AI cleaned
              </span>
            )}
          </div>

          {activeEntries.length > todayEntries.length && (
            <button
              type="button"
              onClick={() => onNavigate("entries")}
              className="text-xs font-semibold text-gray-600 dark:text-zinc-400 hover:text-black dark:hover:text-white flex items-center gap-1 transition-colors"
            >
              <span>View all past entries</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {todayEntries.length === 0 ? (
          <div className="text-center py-14 px-4 bg-white dark:bg-zinc-900/40 rounded-2xl border border-dashed border-[#E5E7EB] dark:border-zinc-800 shadow-xs">
            <div className="w-10 h-10 rounded-full bg-[#F3F4F6] dark:bg-zinc-800 text-gray-400 mx-auto flex items-center justify-center mb-3">
              <Clock className="w-5 h-5" />
            </div>
            <h3 className="text-base font-serif italic text-gray-900 dark:text-zinc-100">
              No entries recorded yet today
            </h3>
            <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto font-sans">
              Tap the microphone to record a quick 30-second voice note or type your updates above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {todayEntries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
