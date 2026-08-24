import React, { useState } from "react";
import {
  Settings,
  Sparkles,
  Tag,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  Download,
  ShieldCheck,
  Zap,
  Globe,
  Database,
  Server,
  Activity,
  RefreshCw,
  Copy,
  Check,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWorkLog } from "../context/WorkLogContext";
import { firebaseConfig, testConnection } from "../lib/firebase";
import { saveAs } from "file-saver";

export const SettingsView: React.FC = () => {
  const {
    user,
    profile,
    updateProfileSettings,
    addCustomTag,
    removeCustomTag,
    tasksAuthorized,
    requestTasksAccess,
  } = useAuth();
  const { entries, projects, activityLogs, logActivity } = useWorkLog();

  const [newTag, setNewTag] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [pingLatency, setPingLatency] = useState<number | null>(null);
  const [isPinging, setIsPinging] = useState(false);
  const [copiedConfig, setCopiedConfig] = useState(false);

  const handleTestLatency = async () => {
    setIsPinging(true);
    const start = performance.now();
    try {
      await testConnection();
      const elapsed = Math.round(performance.now() - start);
      setPingLatency(elapsed);
    } catch {
      setPingLatency(-1);
    } finally {
      setIsPinging(false);
    }
  };

  const handleCopyConfig = () => {
    navigator.clipboard.writeText(JSON.stringify(firebaseConfig, null, 2));
    setCopiedConfig(true);
    setTimeout(() => setCopiedConfig(false), 2000);
  };

  const handleToggleDefaultEnhance = async (checked: boolean) => {
    setIsUpdating(true);
    await updateProfileSettings({ defaultEnhanceOn: checked });
    await logActivity("update", `Changed default AI enhancement setting to ${checked ? "Enabled" : "Disabled"}`);
    setIsUpdating(false);
  };

  const handleAddTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTag.trim()) return;
    const cleanTag = newTag.trim().toLowerCase();
    await addCustomTag(cleanTag);
    await logActivity("tag", `Added custom tag "#${cleanTag}"`);
    setNewTag("");
  };

  const handleRemoveTag = async (tagToRemove: string) => {
    await removeCustomTag(tagToRemove);
    await logActivity("tag", `Removed custom tag "#${tagToRemove}"`);
  };

  const handleExportBackup = () => {
    const backup = {
      exportedAt: new Date().toISOString(),
      user: {
        id: user?.uid,
        email: user?.email,
        displayName: user?.displayName,
      },
      profile,
      projects,
      entries,
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], {
      type: "application/json",
    });
    saveAs(blob, `work-log-full-backup-${new Date().toISOString().split("T")[0]}.json`);
    logActivity("export", `Exported full JSON workspace backup (${entries.length} entries, ${projects.length} projects)`).catch((e) =>
      console.warn(e)
    );
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <div className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-1">
          Configuration & Accounts
        </div>
        <h1 className="text-2xl sm:text-3xl font-serif italic text-gray-900 dark:text-zinc-100">
          Preferences & Backend Diagnostics
        </h1>
        <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-0.5 font-sans">
          Monitor cloud database synchronization, inspect connected Google Cloud project credentials, and configure defaults
        </p>
      </div>

      {/* Settings Sections */}
      <div className="space-y-5 font-sans">
        {/* Backend & Cloud Database Diagnostics */}
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E7EB] dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 flex items-center gap-2">
                  <span>Firebase & Google Cloud Connection</span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Live Connected
                  </span>
                </h2>
                <p className="text-xs text-gray-400">
                  Provisioned Google Cloud Project ID: <code className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">{firebaseConfig.projectId}</code>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="test-cloud-ping-btn"
                onClick={handleTestLatency}
                disabled={isPinging}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#F3F4F6] dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl border border-[#E5E7EB] dark:border-zinc-700 transition-colors"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isPinging ? "animate-spin" : ""}`} />
                <span>{isPinging ? "Pinging..." : "Test Cloud Latency"}</span>
              </button>

              <button
                type="button"
                id="copy-firebase-config-btn"
                onClick={handleCopyConfig}
                className="p-1.5 text-xs font-semibold bg-[#F3F4F6] dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-xl border border-[#E5E7EB] dark:border-zinc-700 transition-colors"
                title="Copy Firebase Config JSON"
              >
                {copiedConfig ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Telemetry Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
            <div className="p-3 bg-[#F9FAFB] dark:bg-zinc-800/60 rounded-xl border border-[#E5E7EB] dark:border-zinc-700/60">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                Auth Status
              </span>
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate block mt-0.5">
                {user?.isAnonymous ? "Guest Developer" : user?.email || "Authenticated"}
              </span>
              <span className="text-[10px] text-gray-400 font-mono truncate block">
                UID: {user?.uid ? user.uid.substring(0, 8) + "..." : "none"}
              </span>
            </div>

            <div className="p-3 bg-[#F9FAFB] dark:bg-zinc-800/60 rounded-xl border border-[#E5E7EB] dark:border-zinc-700/60">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                Local Cache
              </span>
              <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                IndexedDB Active
              </span>
              <span className="text-[10px] text-gray-400 block">
                Multi-Tab Persistent
              </span>
            </div>

            <div className="p-3 bg-[#F9FAFB] dark:bg-zinc-800/60 rounded-xl border border-[#E5E7EB] dark:border-zinc-700/60">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                Synced Documents
              </span>
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mt-0.5">
                {entries.length} Entries • {projects.length} Projs
              </span>
              <span className="text-[10px] text-gray-400 block">
                {activityLogs.length} audit records
              </span>
            </div>

            <div className="p-3 bg-[#F9FAFB] dark:bg-zinc-800/60 rounded-xl border border-[#E5E7EB] dark:border-zinc-700/60">
              <span className="text-[10px] uppercase font-bold text-gray-400 block tracking-wider">
                Cloud Latency
              </span>
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block mt-0.5">
                {pingLatency !== null ? `${pingLatency} ms` : "Verified OK"}
              </span>
              <span className="text-[10px] text-gray-400 block">
                Direct Firestore SDK
              </span>
            </div>
          </div>

          <div className="pt-2 text-[11px] text-gray-500 dark:text-zinc-400 leading-relaxed border-t border-[#E5E7EB] dark:border-zinc-800">
            <strong>Architecture Note:</strong> This application communicates directly via secure client-to-cloud connections to Firestore using the Google Cloud project <code className="font-mono text-zinc-800 dark:text-zinc-200 font-semibold">{firebaseConfig.projectId}</code>. Documents live in the <code className="font-mono">/entries</code>, <code className="font-mono">/projects</code>, and <code className="font-mono">/users</code> collections.
          </div>
        </div>

        {/* AI Enhancement Preferences */}
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E7EB] dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                Gemini AI Text Enhancement
              </h2>
              <p className="text-xs text-gray-400">
                Gemini 2.5/Flash model for grammar cleanup and action bullets
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E7EB] dark:border-zinc-800 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 block">
                Enable AI enhancement by default on new entries
              </span>
              <span className="text-[11px] text-gray-400">
                When turned off, logs save instantly as raw text with zero API calls until manually enhanced.
              </span>
            </div>

            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                id="settings-default-enhance-toggle"
                checked={profile?.defaultEnhanceOn || false}
                disabled={isUpdating}
                onChange={(e) => handleToggleDefaultEnhance(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-10 h-5 bg-gray-200 peer-focus:outline-hidden rounded-full peer dark:bg-zinc-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-zinc-600 peer-checked:bg-black dark:peer-checked:bg-white"></div>
            </label>
          </div>
        </div>

        {/* Google Tasks Integration */}
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E7EB] dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                  Google Tasks Integration
                </h2>
                <p className="text-xs text-gray-400">
                  Schedule follow-ups directly to your Google account tasks list
                </p>
              </div>
            </div>

            {tasksAuthorized ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Connected</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                <span>Scope Needed</span>
              </span>
            )}
          </div>

          <div className="pt-3 border-t border-[#E5E7EB] dark:border-zinc-800 flex items-center justify-between">
            <p className="text-xs text-gray-500 leading-relaxed max-w-md">
              Link entries with one click to Google Tasks with auto-generated titles, project context, and due dates.
            </p>
            <button
              type="button"
              id="reauthorize-google-tasks-btn"
              onClick={requestTasksAccess}
              className="px-3.5 py-2 text-xs font-semibold bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-xl transition-opacity"
            >
              {tasksAuthorized ? "Refresh Tasks Access" : "Connect Google Tasks"}
            </button>
          </div>
        </div>

        {/* Custom Tag Management */}
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E7EB] dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#F3F4F6] dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 flex items-center justify-center">
              <Tag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                Custom Tags & Categories
              </h2>
              <p className="text-xs text-gray-400">
                Manage tags available in the quick logging chips
              </p>
            </div>
          </div>

          {/* Add Tag Form */}
          <form onSubmit={handleAddTag} className="flex items-center gap-2 pt-2">
            <input
              type="text"
              id="settings-new-tag-input"
              value={newTag}
              onChange={(e) => setNewTag(e.target.value)}
              placeholder="e.g. refactor, standup, incident, release"
              className="px-3 py-2 text-xs bg-[#F9FAFB] dark:bg-zinc-800 border border-[#E5E7EB] dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-1 focus:ring-black flex-1 max-w-xs"
            />
            <button
              type="submit"
              disabled={!newTag.trim()}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-xl transition-opacity disabled:opacity-40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Tag</span>
            </button>
          </form>

          {/* Tag List */}
          <div className="flex flex-wrap gap-2 pt-2">
            {(profile?.tagList || []).map((t) => (
              <span
                key={t}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-[#F3F4F6] dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-[#E5E7EB] dark:border-zinc-700/60"
              >
                <span>#{t}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveTag(t)}
                  title={`Remove #${t}`}
                  className="text-gray-400 hover:text-rose-500 transition-colors"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Data Portability / JSON Backup */}
        <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E7EB] dark:border-zinc-800 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Database className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
                  Data Backup & Export
                </h2>
                <p className="text-xs text-gray-400">
                  Download an offline JSON dump of all your projects, entries, and metadata
                </p>
              </div>
            </div>

            <button
              type="button"
              id="download-backup-json-btn"
              onClick={handleExportBackup}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-[#F3F4F6] dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-800 dark:text-zinc-200 border border-[#E5E7EB] dark:border-zinc-700 rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export JSON Backup</span>
            </button>
          </div>
        </div>

        {/* Free Tier Architecture Info */}
        <div className="p-4 bg-[#F9FAFB] dark:bg-zinc-900/50 rounded-2xl border border-[#E5E7EB] dark:border-zinc-800/80 text-xs text-gray-500 space-y-1.5">
          <div className="font-semibold text-gray-800 dark:text-zinc-300 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Zero-Cost Cloud Infrastructure</span>
          </div>
          <p>
            This personal application runs entirely within cost-effective services: Firebase Firestore Spark tier, browser-native Web Speech API, Google Gemini API, and Google Tasks API.
          </p>
        </div>
      </div>
    </div>
  );
};
