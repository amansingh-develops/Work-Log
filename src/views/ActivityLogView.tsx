import React, { useState, useMemo } from "react";
import {
  History,
  PlusCircle,
  Edit3,
  Trash2,
  RotateCcw,
  CheckSquare,
  Sparkles,
  Calendar,
  Clock,
  Search,
  Download,
  FileSpreadsheet,
  FileJson,
  Tag,
  Share2,
  RefreshCw,
  AlertTriangle,
  Check,
  Filter,
} from "lucide-react";
import { saveAs } from "file-saver";
import { useWorkLog } from "../context/WorkLogContext";
import { formatRelativeTime, formatTime, formatDate, getTodayString } from "../lib/utils";
import { ActivityAction, ActivityLog } from "../types";

export const ActivityLogView: React.FC = () => {
  const { activityLogs, clearActivityLogs, loading } = useWorkLog();
  const [filterAction, setFilterAction] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const todayStr = getTodayString();

  // Filtered & Searched Logs
  const filteredLogs = useMemo(() => {
    return activityLogs.filter((log) => {
      // Action filter
      if (filterAction !== "all" && log.action !== filterAction) {
        return false;
      }
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const summaryMatch = (log.changeSummary || "").toLowerCase().includes(q);
        const actionMatch = (log.action || "").toLowerCase().includes(q);
        const entryIdMatch = (log.entryId || "").toLowerCase().includes(q);
        const dateMatch = (log.timestamp || "").toLowerCase().includes(q);
        if (!summaryMatch && !actionMatch && !entryIdMatch && !dateMatch) {
          return false;
        }
      }
      return true;
    });
  }, [activityLogs, filterAction, searchQuery]);

  // Key Metrics
  const stats = useMemo(() => {
    const total = activityLogs.length;
    let todayCount = 0;
    let creations = 0;
    let updates = 0;
    let tasks = 0;

    for (const log of activityLogs) {
      if (log.timestamp && log.timestamp.startsWith(todayStr)) {
        todayCount++;
      }
      if (log.action === "create") creations++;
      if (log.action === "update") updates++;
      if (log.action === "schedule_task") tasks++;
    }

    return { total, todayCount, creations, updates, tasks };
  }, [activityLogs, todayStr]);

  const getActionIcon = (action: ActivityAction) => {
    switch (action) {
      case "create":
        return <PlusCircle className="w-4 h-4 text-emerald-500" />;
      case "update":
        return <Edit3 className="w-4 h-4 text-blue-500" />;
      case "delete":
        return <Trash2 className="w-4 h-4 text-rose-500" />;
      case "restore":
        return <RotateCcw className="w-4 h-4 text-amber-500" />;
      case "schedule_task":
        return <CheckSquare className="w-4 h-4 text-purple-500" />;
      case "export":
        return <Download className="w-4 h-4 text-indigo-500" />;
      case "tag":
        return <Tag className="w-4 h-4 text-cyan-500" />;
      case "system":
        return <Sparkles className="w-4 h-4 text-teal-500" />;
      default:
        return <History className="w-4 h-4 text-zinc-400" />;
    }
  };

  const getActionBadge = (action: ActivityAction) => {
    switch (action) {
      case "create":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800";
      case "update":
        return "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800";
      case "delete":
        return "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800";
      case "restore":
        return "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800";
      case "schedule_task":
        return "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800";
      case "export":
        return "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800";
      case "tag":
        return "bg-cyan-50 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-800";
      case "system":
        return "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800";
      default:
        return "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700";
    }
  };

  const getActionLabel = (action: ActivityAction) => {
    switch (action) {
      case "create":
        return "Created";
      case "update":
        return "Updated";
      case "delete":
        return "Deleted";
      case "restore":
        return "Restored";
      case "schedule_task":
        return "Task Scheduled";
      case "export":
        return "Export";
      case "tag":
        return "Tag";
      case "system":
        return "System";
      default:
        return action;
    }
  };

  // Export as CSV
  const handleExportCsv = () => {
    const headers = ["Timestamp", "Date", "Time", "Action", "Summary", "Entry ID", "Owner ID"];
    const rows = filteredLogs.map((l) => [
      `"${l.timestamp || ""}"`,
      `"${l.timestamp ? formatDate(l.timestamp.split("T")[0]) : ""}"`,
      `"${l.timestamp ? formatTime(l.timestamp) : ""}"`,
      `"${l.action}"`,
      `"${(l.changeSummary || "").replace(/"/g, '""')}"`,
      `"${l.entryId || ""}"`,
      `"${l.ownerId || ""}"`,
    ]);
    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    saveAs(blob, `activity-log-${todayStr}.csv`);
    setExportSuccess("CSV exported");
    setTimeout(() => setExportSuccess(null), 2500);
  };

  // Export as JSON
  const handleExportJson = () => {
    const blob = new Blob([JSON.stringify(filteredLogs, null, 2)], {
      type: "application/json",
    });
    saveAs(blob, `activity-log-${todayStr}.json`);
    setExportSuccess("JSON exported");
    setTimeout(() => setExportSuccess(null), 2500);
  };

  // Handle Clear History
  const handleConfirmClear = async () => {
    setIsClearing(true);
    try {
      await clearActivityLogs();
      setShowClearConfirm(false);
    } catch (err) {
      console.error("Failed to clear activity logs:", err);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
              System & History
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Sync
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif italic text-gray-900 dark:text-zinc-100">
            Activity Audit Log
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-0.5 font-sans">
            Real-time, continuous audit trail tracking all work log creations, updates, AI enhancements, task schedules, and data exports.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="export-activity-csv-btn"
            onClick={handleExportCsv}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl border border-[#E5E7EB] dark:border-zinc-700 shadow-2xs transition-colors disabled:opacity-40"
            title="Download audit records as CSV"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>CSV</span>
          </button>

          <button
            type="button"
            id="export-activity-json-btn"
            onClick={handleExportJson}
            disabled={filteredLogs.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-white dark:bg-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl border border-[#E5E7EB] dark:border-zinc-700 shadow-2xs transition-colors disabled:opacity-40"
            title="Download audit records as JSON"
          >
            <FileJson className="w-3.5 h-3.5 text-blue-600" />
            <span>JSON</span>
          </button>

          {activityLogs.length > 0 && (
            <button
              type="button"
              id="clear-activity-logs-btn"
              onClick={() => setShowClearConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl border border-rose-200 dark:border-rose-900 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear History</span>
            </button>
          )}

          {exportSuccess && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 font-semibold animate-in fade-in">
              <Check className="w-3.5 h-3.5" />
              {exportSuccess}
            </span>
          )}
        </div>
      </div>

      {/* Summary Metrics Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E7EB] dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
            Total Recorded Events
          </span>
          <span className="text-xl sm:text-2xl font-serif italic text-zinc-900 dark:text-zinc-100 block mt-1">
            {stats.total}
          </span>
          <span className="text-[11px] text-gray-400 block mt-0.5">
            Full audit log size
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E7EB] dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
            Activity Today
          </span>
          <span className="text-xl sm:text-2xl font-serif italic text-emerald-600 dark:text-emerald-400 block mt-1">
            {stats.todayCount}
          </span>
          <span className="text-[11px] text-gray-400 block mt-0.5">
            {stats.todayCount === 1 ? "1 action recorded" : `${stats.todayCount} actions recorded`}
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E7EB] dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
            Created Items
          </span>
          <span className="text-xl sm:text-2xl font-serif italic text-blue-600 dark:text-blue-400 block mt-1">
            {stats.creations}
          </span>
          <span className="text-[11px] text-gray-400 block mt-0.5">
            Entries & Projects
          </span>
        </div>

        <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E7EB] dark:border-zinc-800 shadow-xs">
          <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
            Task Follow-Ups
          </span>
          <span className="text-xl sm:text-2xl font-serif italic text-purple-600 dark:text-purple-400 block mt-1">
            {stats.tasks}
          </span>
          <span className="text-[11px] text-gray-400 block mt-0.5">
            Google Tasks synced
          </span>
        </div>
      </div>

      {/* Filter and Search Toolbar */}
      <div className="p-4 bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E7EB] dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="activity-search-input"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search activity by keyword, project, or date..."
            className="w-full pl-9 pr-3 py-2 text-xs bg-[#F9FAFB] dark:bg-zinc-800 border border-[#E5E7EB] dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder:text-gray-400 focus:outline-hidden focus:ring-1 focus:ring-black dark:focus:ring-white"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-zinc-700 text-xs"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-gray-400" />
          <select
            id="activity-filter-select"
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="px-3 py-2 text-xs font-semibold bg-[#F9FAFB] dark:bg-zinc-800 border border-[#E5E7EB] dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden"
          >
            <option value="all">All Action Types ({activityLogs.length})</option>
            <option value="create">Created Items</option>
            <option value="update">Updates & AI Enhancements</option>
            <option value="delete">Deletions</option>
            <option value="restore">Restorations</option>
            <option value="schedule_task">Google Task Follow-ups</option>
            <option value="export">Exports & Backups</option>
            <option value="tag">Tag Customizations</option>
            <option value="system">System Events</option>
          </select>
        </div>
      </div>

      {/* Activity Timeline List */}
      {filteredLogs.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-zinc-900 rounded-2xl border border-dashed border-[#E5E7EB] dark:border-zinc-800 shadow-xs">
          <History className="w-10 h-10 text-gray-300 dark:text-zinc-700 mx-auto mb-3" />
          <h3 className="text-base font-serif italic text-gray-900 dark:text-zinc-100">
            {searchQuery || filterAction !== "all"
              ? "No activities match your filter"
              : "No activity logged yet"}
          </h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto font-sans">
            {searchQuery || filterAction !== "all"
              ? "Try adjusting your search query or reset the action filter to see all events."
              : "Audit logs are recorded automatically whenever you create, edit, enhance, or delete work items."}
          </p>
          {(searchQuery || filterAction !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setFilterAction("all");
              }}
              className="mt-4 px-3.5 py-1.5 text-xs font-semibold bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 transition-opacity"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E7EB] dark:border-zinc-800 shadow-xs divide-y divide-[#F3F4F6] dark:divide-zinc-800/80 overflow-hidden font-sans">
          {filteredLogs.map((log) => (
            <div
              key={log.id}
              className="p-4 sm:p-5 hover:bg-[#FAFAFA] dark:hover:bg-zinc-800/40 transition-colors flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="p-2.5 rounded-xl bg-[#F3F4F6] dark:bg-zinc-800 flex-shrink-0">
                  {getActionIcon(log.action)}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${getActionBadge(
                        log.action
                      )}`}
                    >
                      {getActionLabel(log.action)}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-zinc-100 break-words">
                      {log.changeSummary}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-1 flex-wrap">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-gray-400" />
                      <span>{formatRelativeTime(log.timestamp)}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-gray-400" />
                      <span>
                        {formatDate(log.timestamp ? log.timestamp.split("T")[0] : todayStr)}{" "}
                        {log.timestamp ? formatTime(log.timestamp) : ""}
                      </span>
                    </div>
                    {log.entryId && (
                      <>
                        <span>•</span>
                        <span className="font-mono text-[10px] text-gray-400 bg-gray-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                          ID: {log.entryId.substring(0, 8)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation Modal for Clearing History */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl border border-[#E5E7EB] dark:border-zinc-800 shadow-2xl p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-serif italic text-gray-900 dark:text-zinc-100">
                  Clear Audit Log History?
                </h3>
                <p className="text-xs text-gray-500 dark:text-zinc-400 mt-0.5">
                  This will purge all {activityLogs.length} activity audit log records from Firestore.
                </p>
              </div>
            </div>

            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed bg-[#F9FAFB] dark:bg-zinc-800 p-3 rounded-xl">
              This action cannot be undone. Your actual projects and work log entries will not be affected.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                disabled={isClearing}
                className="px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                id="confirm-clear-logs-btn"
                onClick={handleConfirmClear}
                disabled={isClearing}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl transition-colors disabled:opacity-50"
              >
                {isClearing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                <span>{isClearing ? "Clearing..." : "Yes, Clear History"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
