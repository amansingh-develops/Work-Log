import React, { useState, useMemo } from "react";
import {
  FileDown,
  FileText,
  Calendar,
  Folder,
  Download,
  Copy,
  Check,
  Sparkles,
  BarChart3,
  Layers,
  FileCode,
} from "lucide-react";
import { useWorkLog } from "../context/WorkLogContext";
import { useAuth } from "../context/AuthContext";
import {
  exportPdf,
  exportDocx,
  exportTxt,
  generateTxtReport,
  groupEntriesByDate,
} from "../services/exportService";
import { formatDate, getTodayString } from "../lib/utils";
import { getProjectColor } from "../types";

export const ReportsView: React.FC = () => {
  const { activeEntries, projects, projectsMap, logActivity } = useWorkLog();
  const { user, profile } = useAuth();

  // Filter States
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");
  const [dateRangePreset, setDateRangePreset] = useState<
    "today" | "7days" | "thisMonth" | "lastMonth" | "custom"
  >("7days");

  const todayStr = getTodayString();

  // Helper date calculators
  const defaultDates = useMemo(() => {
    const now = new Date();
    const today = getTodayString();

    const d7 = new Date();
    d7.setDate(d7.getDate() - 7);
    const start7 = d7.toISOString().split("T")[0];

    const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      .toISOString()
      .split("T")[0];

    const firstLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
      .toISOString()
      .split("T")[0];
    const lastLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)
      .toISOString()
      .split("T")[0];

    return { today, start7, firstThisMonth, firstLastMonth, lastLastMonth };
  }, []);

  const [startDate, setStartDate] = useState<string>(defaultDates.start7);
  const [endDate, setEndDate] = useState<string>(defaultDates.today);
  const [copied, setCopied] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);

  const handlePresetChange = (preset: typeof dateRangePreset) => {
    setDateRangePreset(preset);
    if (preset === "today") {
      setStartDate(defaultDates.today);
      setEndDate(defaultDates.today);
    } else if (preset === "7days") {
      setStartDate(defaultDates.start7);
      setEndDate(defaultDates.today);
    } else if (preset === "thisMonth") {
      setStartDate(defaultDates.firstThisMonth);
      setEndDate(defaultDates.today);
    } else if (preset === "lastMonth") {
      setStartDate(defaultDates.firstLastMonth);
      setEndDate(defaultDates.lastLastMonth);
    }
  };

  // Filtered Entries for report
  const reportEntries = useMemo(() => {
    return activeEntries.filter((entry) => {
      if (selectedProjectId !== "all" && entry.projectId !== selectedProjectId) {
        return false;
      }
      if (startDate && entry.date < startDate) return false;
      if (endDate && entry.date > endDate) return false;
      return true;
    });
  }, [activeEntries, selectedProjectId, startDate, endDate]);

  const grouped = useMemo(() => groupEntriesByDate(reportEntries), [reportEntries]);

  // Statistics
  const activeDaysCount = useMemo(() => Object.keys(grouped).length, [grouped]);
  const targetedProject = selectedProjectId === "all" ? null : projectsMap.get(selectedProjectId);
  const projectName = targetedProject ? targetedProject.name : "All Projects";
  const userName = user?.displayName || profile?.displayName || "Developer";

  // Tag frequency breakdown
  const tagCounts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of reportEntries) {
      for (const t of e.tags) {
        map[t] = (map[t] || 0) + 1;
      }
    }
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [reportEntries]);

  // Actions
  const handleExportPdf = () => {
    setExportingFormat("pdf");
    try {
      const filename = `work-log-${startDate}-to-${endDate}.pdf`;
      exportPdf(
        {
          entries: reportEntries,
          projectsMap,
          userName,
          projectName,
          startDate,
          endDate,
        },
        filename
      );
      logActivity("export", `Exported PDF report (${reportEntries.length} entries) for "${projectName}"`).catch((e) =>
        console.warn(e)
      );
    } catch (err) {
      console.error("PDF export error:", err);
    } finally {
      setExportingFormat(null);
    }
  };

  const handleExportDocx = async () => {
    setExportingFormat("docx");
    try {
      const filename = `work-log-${startDate}-to-${endDate}.docx`;
      await exportDocx(
        {
          entries: reportEntries,
          projectsMap,
          userName,
          projectName,
          startDate,
          endDate,
        },
        filename
      );
      logActivity("export", `Exported DOCX report (${reportEntries.length} entries) for "${projectName}"`).catch((e) =>
        console.warn(e)
      );
    } catch (err) {
      console.error("DOCX export error:", err);
    } finally {
      setExportingFormat(null);
    }
  };

  const handleExportTxt = () => {
    setExportingFormat("txt");
    try {
      const filename = `work-log-${startDate}-to-${endDate}.txt`;
      exportTxt(
        {
          entries: reportEntries,
          projectsMap,
          userName,
          projectName,
          startDate,
          endDate,
        },
        filename
      );
      logActivity("export", `Exported TXT report (${reportEntries.length} entries) for "${projectName}"`).catch((e) =>
        console.warn(e)
      );
    } catch (err) {
      console.error("TXT export error:", err);
    } finally {
      setExportingFormat(null);
    }
  };

  const handleCopyTxt = () => {
    const content = generateTxtReport({
      entries: reportEntries,
      projectsMap,
      userName,
      projectName,
      startDate,
      endDate,
    });
    navigator.clipboard.writeText(content);
    setCopied(true);
    logActivity("export", `Copied Markdown summary (${reportEntries.length} entries) for "${projectName}"`).catch((e) =>
      console.warn(e)
    );
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-1">
            Publication & Export
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif italic text-gray-900 dark:text-zinc-100">
            Reports & Export
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-0.5 font-sans">
            Generate polished mentor-ready reports in PDF, Word (DOCX), or plain text
          </p>
        </div>

        {/* Quick Action Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            id="export-pdf-btn"
            onClick={handleExportPdf}
            disabled={reportEntries.length === 0 || !!exportingFormat}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PDF</span>
          </button>

          <button
            type="button"
            id="export-docx-btn"
            onClick={handleExportDocx}
            disabled={reportEntries.length === 0 || !!exportingFormat}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download DOCX</span>
          </button>

          <button
            type="button"
            id="export-txt-btn"
            onClick={handleExportTxt}
            disabled={reportEntries.length === 0 || !!exportingFormat}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#F3F4F6] dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 border border-[#E5E7EB] dark:border-zinc-700 rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>TXT</span>
          </button>

          <button
            type="button"
            id="copy-txt-btn"
            onClick={handleCopyTxt}
            disabled={reportEntries.length === 0}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#F3F4F6] dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 border border-[#E5E7EB] dark:border-zinc-700 rounded-xl transition-colors disabled:opacity-40 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-500" />
                <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-gray-400" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Scope & Date Range Configuration Card */}
      <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E7EB] dark:border-zinc-800 shadow-xs space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Project Selector */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Folder className="w-3.5 h-3.5 text-gray-400" />
              Scope / Project
            </label>
            <select
              id="report-project-select"
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full px-3 py-2 text-xs font-semibold bg-[#F9FAFB] dark:bg-zinc-800 border border-[#E5E7EB] dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
            >
              <option value="all">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.archived ? "(Archived)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Preset */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5 flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Range Preset
            </label>
            <select
              value={dateRangePreset}
              onChange={(e) => handlePresetChange(e.target.value as any)}
              className="w-full px-3 py-2 text-xs font-semibold bg-[#F9FAFB] dark:bg-zinc-800 border border-[#E5E7EB] dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
            >
              <option value="today">Today</option>
              <option value="7days">Last 7 Days</option>
              <option value="thisMonth">This Month</option>
              <option value="lastMonth">Last Month</option>
              <option value="custom">Custom Date Range</option>
            </select>
          </div>

          {/* Start Date */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => {
                setStartDate(e.target.value);
                setDateRangePreset("custom");
              }}
              className="w-full px-3 py-2 text-xs bg-[#F9FAFB] dark:bg-zinc-800 border border-[#E5E7EB] dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
            />
          </div>

          {/* End Date */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => {
                setEndDate(e.target.value);
                setDateRangePreset("custom");
              }}
              className="w-full px-3 py-2 text-xs bg-[#F9FAFB] dark:bg-zinc-800 border border-[#E5E7EB] dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
            />
          </div>
        </div>

        {/* Summary Metrics Bar */}
        <div className="pt-3 border-t border-[#E5E7EB] dark:border-zinc-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 bg-[#F9FAFB] dark:bg-zinc-800/60 rounded-xl border border-[#E5E7EB] dark:border-zinc-700/60">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Total Entries</span>
            <span className="text-lg font-serif italic text-gray-900 dark:text-zinc-100">
              {reportEntries.length}
            </span>
          </div>

          <div className="p-3.5 bg-[#F9FAFB] dark:bg-zinc-800/60 rounded-xl border border-[#E5E7EB] dark:border-zinc-700/60">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block">Active Days</span>
            <span className="text-lg font-serif italic text-gray-900 dark:text-zinc-100">
              {activeDaysCount}
            </span>
          </div>

          <div className="p-3.5 bg-[#F9FAFB] dark:bg-zinc-800/60 rounded-xl border border-[#E5E7EB] dark:border-zinc-700/60 col-span-2">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider block mb-1">Top Category Tags</span>
            <div className="flex flex-wrap gap-1">
              {tagCounts.length > 0 ? (
                tagCounts.map(([t, count]) => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#E5E7EB] dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                  >
                    #{t} ({count})
                  </span>
                ))
              ) : (
                <span className="text-[11px] text-gray-400 italic">No tagged entries</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Live Report Preview */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E7EB] dark:border-zinc-800 shadow-xs overflow-hidden">
        {/* Document Header Representation */}
        <div className="p-6 bg-black text-white dark:bg-zinc-950 border-b border-zinc-800">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">
                Document Preview
              </span>
              <h2 className="text-xl font-serif italic text-white mt-0.5">
                Daily Work Log Report
              </h2>
            </div>
            <div className="text-right text-xs text-gray-300 font-sans">
              <div>{formatDate(startDate)} — {formatDate(endDate)}</div>
              <div className="text-[11px] text-gray-400">{projectName}</div>
            </div>
          </div>
        </div>

        {/* Report Content Stream */}
        <div className="p-6 space-y-6 max-h-[600px] overflow-y-auto font-sans">
          {reportEntries.length === 0 ? (
            <div className="text-center py-12 text-zinc-400 text-xs">
              No entries found matching this project and date range. Try broadening your dates.
            </div>
          ) : (
            (Object.entries(grouped) as [string, typeof reportEntries][]).map(([date, dateEntries]) => (
              <div key={date} className="space-y-3">
                {/* Date sub-header */}
                <div className="flex items-center gap-2 pb-1.5 border-b border-zinc-200 dark:border-zinc-800">
                  <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {formatDate(date)}
                  </h3>
                  <span className="text-[11px] text-zinc-400">
                    ({dateEntries.length} {dateEntries.length === 1 ? "entry" : "entries"})
                  </span>
                </div>

                {/* Bullets */}
                <div className="space-y-3 pl-2">
                  {dateEntries.map((entry) => {
                    const project = projectsMap.get(entry.projectId);
                    const colorTheme = getProjectColor(project?.colorTag);
                    const textToUse = entry.activeVersion === "enhanced" && entry.enhancedText
                      ? entry.enhancedText
                      : entry.rawText;

                    return (
                      <div key={entry.id} className="text-xs space-y-1">
                        {/* Project & Tags Header */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-semibold text-[11px] border ${colorTheme.badgeClass}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${colorTheme.dotClass}`} />
                            {project?.name || "General"}
                          </span>
                          {entry.tags.map((tag) => (
                            <span
                              key={tag}
                              className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 text-[10px]"
                            >
                              #{tag}
                            </span>
                          ))}
                          {entry.activeVersion === "enhanced" && (
                            <span className="text-[10px] text-purple-600 dark:text-purple-400 flex items-center gap-0.5 font-medium ml-1">
                              <Sparkles className="w-2.5 h-2.5" />
                              AI formatted
                            </span>
                          )}
                        </div>

                        {/* Text lines */}
                        <div className="pl-3 space-y-0.5 text-zinc-700 dark:text-zinc-300 leading-relaxed">
                          {textToUse.split("\n").map((line, lidx) => {
                            if (!line.trim()) return null;
                            const isBullet = line.trim().startsWith("-") || line.trim().startsWith("•");
                            return (
                              <div key={lidx} className="flex items-start gap-1.5">
                                <span className="text-zinc-400 select-none">•</span>
                                <span>{isBullet ? line.replace(/^[-•*]\s*/, "") : line}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
