import React, { useState, useMemo } from "react";
import {
  Search,
  Filter,
  Calendar,
  Folder,
  Tag,
  Sparkles,
  Mic,
  RotateCcw,
  Layers,
  ArrowUpDown,
} from "lucide-react";
import { useWorkLog } from "../context/WorkLogContext";
import { useAuth } from "../context/AuthContext";
import { WorkEntry, getProjectColor } from "../types";
import { formatDate, getTodayString } from "../lib/utils";
import { EntryCard } from "../components/EntryCard";

export const EntriesView: React.FC = () => {
  const { activeEntries, projects, projectsMap } = useWorkLog();
  const { profile } = useAuth();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState("all");
  const [selectedTag, setSelectedTag] = useState("all");
  const [selectedSource, setSelectedSource] = useState<"all" | "voice" | "text">("all");
  const [selectedVersion, setSelectedVersion] = useState<"all" | "enhanced" | "raw">("all");
  const [dateFilterType, setDateFilterType] = useState<"all" | "today" | "7days" | "30days" | "custom">("all");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [groupBy, setGroupBy] = useState<"date" | "project">("date");

  const todayStr = getTodayString();

  // Filtered Entries
  const filteredEntries = useMemo(() => {
    return activeEntries.filter((entry) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const rawMatch = entry.rawText.toLowerCase().includes(q);
        const enhancedMatch = entry.enhancedText?.toLowerCase().includes(q);
        const tagMatch = entry.tags.some((t) => t.toLowerCase().includes(q));
        const projName = projectsMap.get(entry.projectId)?.name.toLowerCase() || "";
        if (!rawMatch && !enhancedMatch && !tagMatch && !projName.includes(q)) {
          return false;
        }
      }

      // Project
      if (selectedProjectId !== "all" && entry.projectId !== selectedProjectId) {
        return false;
      }

      // Tag
      if (selectedTag !== "all" && !entry.tags.includes(selectedTag)) {
        return false;
      }

      // Source
      if (selectedSource !== "all" && entry.source !== selectedSource) {
        return false;
      }

      // Version
      if (selectedVersion === "enhanced" && entry.activeVersion !== "enhanced") {
        return false;
      }
      if (selectedVersion === "raw" && entry.activeVersion !== "raw") {
        return false;
      }

      // Date Range
      if (dateFilterType === "today") {
        if (entry.date !== todayStr) return false;
      } else if (dateFilterType === "7days") {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        const minDate = d.toISOString().split("T")[0];
        if (entry.date < minDate) return false;
      } else if (dateFilterType === "30days") {
        const d = new Date();
        d.setDate(d.getDate() - 30);
        const minDate = d.toISOString().split("T")[0];
        if (entry.date < minDate) return false;
      } else if (dateFilterType === "custom") {
        if (customStartDate && entry.date < customStartDate) return false;
        if (customEndDate && entry.date > customEndDate) return false;
      }

      return true;
    });
  }, [
    activeEntries,
    searchQuery,
    selectedProjectId,
    selectedTag,
    selectedSource,
    selectedVersion,
    dateFilterType,
    customStartDate,
    customEndDate,
    todayStr,
    projectsMap,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedProjectId !== "all" ||
    selectedTag !== "all" ||
    selectedSource !== "all" ||
    selectedVersion !== "all" ||
    dateFilterType !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedProjectId("all");
    setSelectedTag("all");
    setSelectedSource("all");
    setSelectedVersion("all");
    setDateFilterType("all");
    setCustomStartDate("");
    setCustomEndDate("");
  };

  // Grouping logic
  const groupedData = useMemo(() => {
    if (groupBy === "date") {
      const groups: { key: string; label: string; entries: WorkEntry[] }[] = [];
      const dateMap: Record<string, WorkEntry[]> = {};

      for (const entry of filteredEntries) {
        if (!dateMap[entry.date]) dateMap[entry.date] = [];
        dateMap[entry.date].push(entry);
      }

      // Sort dates descending
      const sortedDates = Object.keys(dateMap).sort((a, b) => b.localeCompare(a));
      for (const date of sortedDates) {
        groups.push({
          key: date,
          label: formatDate(date),
          entries: dateMap[date],
        });
      }
      return groups;
    } else {
      // Group by project
      const groups: { key: string; label: string; colorTag?: string; entries: WorkEntry[] }[] = [];
      const projMap: Record<string, WorkEntry[]> = {};

      for (const entry of filteredEntries) {
        if (!projMap[entry.projectId]) projMap[entry.projectId] = [];
        projMap[entry.projectId].push(entry);
      }

      for (const [projId, entries] of Object.entries(projMap)) {
        const p = projectsMap.get(projId);
        groups.push({
          key: projId,
          label: p ? p.name : "Uncategorized",
          colorTag: p?.colorTag,
          entries,
        });
      }

      // Sort by project name
      groups.sort((a, b) => a.label.localeCompare(b.label));
      return groups;
    }
  }, [filteredEntries, groupBy, projectsMap]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header & Group Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-1">
            Archive & History
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif italic text-gray-900 dark:text-zinc-100">
            Work Entries
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-0.5 font-sans">
            Showing {filteredEntries.length} of {activeEntries.length} total entries
          </p>
        </div>

        {/* Group By Selector */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider text-[10px]">Group by:</span>
          <div className="inline-flex rounded-xl bg-[#F3F4F6] dark:bg-zinc-800 p-1 text-xs border border-[#E5E7EB] dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setGroupBy("date")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                groupBy === "date"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              Date
            </button>
            <button
              type="button"
              onClick={() => setGroupBy("project")}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                groupBy === "project"
                  ? "bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100 font-semibold shadow-xs"
                  : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900"
              }`}
            >
              Project
            </button>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-5 bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E7EB] dark:border-zinc-800 shadow-xs space-y-3">
        {/* Search input */}
        <div className="relative">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="entries-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search keywords, project names, tags, ticket numbers..."
            className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-[#FAFAFA] dark:bg-zinc-800/50 border border-[#E5E7EB] dark:border-zinc-700/80 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-gray-400 focus:outline-hidden focus:ring-1 focus:ring-black dark:focus:ring-white"
          />
        </div>

        {/* Filter controls row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2 pt-1 text-xs">
          {/* Project filter */}
          <div>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#F9FAFB] dark:bg-zinc-800 border border-[#E5E7EB] dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 font-semibold focus:outline-hidden"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.archived ? "(Archived)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Date range filter */}
          <div>
            <select
              value={dateFilterType}
              onChange={(e) => setDateFilterType(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-[#F9FAFB] dark:bg-zinc-800 border border-[#E5E7EB] dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 font-semibold focus:outline-hidden"
            >
              <option value="all">All Dates</option>
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="30days">Last 30 Days</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Tag filter */}
          <div>
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#F9FAFB] dark:bg-zinc-800 border border-[#E5E7EB] dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 font-semibold focus:outline-hidden"
            >
              <option value="all">All Tags</option>
              {(profile?.tagList || []).map((t) => (
                <option key={t} value={t}>
                  #{t}
                </option>
              ))}
            </select>
          </div>

          {/* Source filter */}
          <div>
            <select
              value={selectedSource}
              onChange={(e) => setSelectedSource(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-[#F9FAFB] dark:bg-zinc-800 border border-[#E5E7EB] dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300 font-semibold focus:outline-hidden"
            >
              <option value="all">All Sources</option>
              <option value="voice">🎙️ Voice Only</option>
              <option value="text">⌨️ Typed Only</option>
            </select>
          </div>

          {/* Reset Filters button */}
          {hasActiveFilters && (
            <div className="col-span-2 sm:col-span-4 lg:col-span-1 flex items-center">
              <button
                type="button"
                onClick={handleResetFilters}
                className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 text-xs text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg hover:bg-rose-100 transition-colors font-semibold"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>
          )}
        </div>

        {/* Custom date range inputs */}
        {dateFilterType === "custom" && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[#E5E7EB] dark:border-zinc-800 text-xs">
            <span className="text-gray-400">From:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1 bg-[#F9FAFB] dark:bg-zinc-800 border border-[#E5E7EB] dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300"
            />
            <span className="text-gray-400">To:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1 bg-[#F9FAFB] dark:bg-zinc-800 border border-[#E5E7EB] dark:border-zinc-700 rounded-lg text-zinc-700 dark:text-zinc-300"
            />
          </div>
        )}
      </div>

      {/* Grouped Entries Content */}
      {filteredEntries.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-zinc-900/40 rounded-2xl border border-dashed border-[#E5E7EB] dark:border-zinc-800 shadow-xs">
          <Calendar className="w-10 h-10 text-gray-300 dark:text-zinc-700 mx-auto mb-3" />
          <h3 className="text-base font-serif italic text-gray-900 dark:text-zinc-100">
            No entries found
          </h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto font-sans">
            {hasActiveFilters
              ? "Try adjusting or clearing your search and filter criteria."
              : "You haven't logged any work entries yet. Start by recording or typing in the Today tab."}
          </p>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 bg-[#F3F4F6] dark:bg-zinc-800 border border-[#E5E7EB] dark:border-zinc-700 rounded-xl hover:bg-gray-200 transition-colors"
            >
              <RotateCcw className="w-3 h-3" />
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          {groupedData.map((group) => {
            const projectColor = group.colorTag ? getProjectColor(group.colorTag) : null;
            return (
              <div key={group.key} className="space-y-3">
                {/* Group Header */}
                <div className="flex items-center gap-2 pb-2 border-b border-[#E5E7EB] dark:border-zinc-800">
                  {projectColor && (
                    <span className={`w-2.5 h-2.5 rounded-full ${projectColor.dotClass}`} />
                  )}
                  <h2 className="text-base font-serif italic text-gray-900 dark:text-zinc-100">
                    {group.label}
                  </h2>
                  <span className="text-xs font-semibold text-gray-400">
                    ({group.entries.length})
                  </span>
                </div>

                {/* Entries Grid */}
                <div className="grid grid-cols-1 gap-4">
                  {group.entries.map((entry) => (
                    <EntryCard key={entry.id} entry={entry} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
