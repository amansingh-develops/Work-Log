import React from "react";
import {
  NotebookPen,
  Calendar,
  FolderKanban,
  FileDown,
  History,
  Trash2,
  Settings,
  LogIn,
  LogOut,
  Sparkles,
  CheckCircle2,
  Menu,
  X,
  Moon,
  Sun,
  Plus,
  Radio,
  Clock,
  Layers,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useWorkLog } from "../context/WorkLogContext";
import { getProjectColor } from "../types";

export type NavTab =
  | "today"
  | "entries"
  | "projects"
  | "reports"
  | "activity"
  | "trash"
  | "settings";

interface NavbarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
}

export const Sidebar: React.FC<{
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  onOpenNewModal?: () => void;
}> = ({ activeTab, onTabChange }) => {
  const { user, logout } = useAuth();
  const { activeProjects, deletedEntries, activeEntries } = useWorkLog();

  const navLinks: { id: NavTab; label: string; icon: React.ElementType; badge?: number }[] = [
    { id: "today", label: "Daily Feed", icon: Calendar },
    { id: "entries", label: "All Entries", icon: Layers, badge: activeEntries.length },
    { id: "projects", label: "Projects", icon: FolderKanban, badge: activeProjects.length },
    { id: "reports", label: "Reports & Export", icon: FileDown },
    { id: "activity", label: "Activity Log", icon: History },
    {
      id: "trash",
      label: "Trash",
      icon: Trash2,
      badge: deletedEntries.length > 0 ? deletedEntries.length : undefined,
    },
    { id: "settings", label: "Settings", icon: Settings },
  ];

  return (
    <aside className="w-64 border-r border-[#E5E7EB] dark:border-zinc-800 bg-[#F3F4F6] dark:bg-zinc-900/70 flex flex-col justify-between p-6 flex-shrink-0 min-h-screen">
      <div className="space-y-7">
        {/* Brand Logo & Editorial Title */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-black dark:bg-white rounded-lg flex items-center justify-center shadow-xs">
            <div className="w-4 h-1 bg-white dark:bg-black rounded-full" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-lg tracking-tight text-zinc-900 dark:text-zinc-100 font-sans">
              Work Log
            </span>
            <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">
              Editorial Edition
            </span>
          </div>
        </div>

        {/* Quick New Entry Button */}
        <button
          type="button"
          onClick={() => onTabChange("today")}
          className="w-full flex items-center gap-3 px-3.5 py-2.5 bg-white dark:bg-zinc-800 rounded-xl shadow-xs border border-[#E5E7EB] dark:border-zinc-700 font-semibold text-xs text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-750 transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4 text-black dark:text-white" />
          <span>New Entry</span>
        </button>

        {/* Navigation Section */}
        <nav className="space-y-1">
          <div className="mb-2 px-3 text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
            Navigation
          </div>
          {navLinks.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                id={`sidebar-link-${item.id}`}
                onClick={() => onTabChange(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors text-left ${
                  isActive
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs border border-[#E5E7EB] dark:border-zinc-700 font-semibold"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/60 dark:hover:bg-zinc-800/40"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-3.5 h-3.5 ${isActive ? "text-zinc-900 dark:text-zinc-100" : "text-zinc-400"}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className="px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Active Projects Stream */}
        <div className="space-y-2">
          <div className="px-3 text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em]">
            Active Projects
          </div>
          <div className="space-y-1">
            {activeProjects.slice(0, 5).map((p) => {
              const theme = getProjectColor(p.colorTag);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onTabChange("projects")}
                  className="w-full flex items-center gap-3 px-3 py-1.5 text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg hover:bg-white/50 dark:hover:bg-zinc-800/40 transition-colors text-left truncate"
                >
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${theme.dotClass}`} />
                  <span className="truncate">{p.name}</span>
                </button>
              );
            })}
            {activeProjects.length === 0 && (
              <p className="px-3 text-xs text-zinc-400 italic">No projects yet</p>
            )}
          </div>
        </div>
      </div>

      {/* User Profile Card in Sidebar */}
      {user && (
        <div className="flex items-center justify-between pt-4 border-t border-[#E5E7EB] dark:border-zinc-800">
          <div className="flex items-center gap-2.5 truncate">
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                referrerPolicy="no-referrer"
                className="w-8 h-8 rounded-full border border-zinc-200 dark:border-zinc-700 flex-shrink-0"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {(user.displayName || user.email || "U")[0].toUpperCase()}
              </div>
            )}
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 truncate">
                {user.displayName || "Workspace User"}
              </span>
              <span className="text-[10px] text-zinc-400">Personal Journal</span>
            </div>
          </div>

          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className="p-1.5 text-zinc-400 hover:text-rose-500 rounded-lg transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </aside>
  );
};

export const HeaderBar: React.FC<{
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onOpenMobileMenu: () => void;
}> = ({ onTabChange, darkMode, onToggleDarkMode, onOpenMobileMenu }) => {
  const { tasksAuthorized } = useAuth();

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <header className="h-16 border-b border-[#E5E7EB] dark:border-zinc-800 bg-white dark:bg-zinc-900 px-4 sm:px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Mobile Hamburger + Date */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="md:hidden p-2 rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex flex-col">
          <h1 className="text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-widest">
            {todayFormatted}
          </h1>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div
          title="Direct Firebase Firestore cloud database connection"
          className="text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full border border-emerald-200/80 dark:border-emerald-800/80 flex items-center gap-1.5"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className="hidden sm:inline">Firestore:</span>
          <span>Synced</span>
        </div>

        <div
          title={
            tasksAuthorized
              ? "Google Tasks OAuth authorized and ready"
              : "Google Tasks scope ready for connection"
          }
          className="text-[11px] font-medium bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-full text-zinc-600 dark:text-zinc-300 border border-zinc-200/60 dark:border-zinc-700/60 flex items-center gap-1.5"
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              tasksAuthorized ? "bg-emerald-500" : "bg-blue-400"
            }`}
          />
          <span className="hidden sm:inline">Tasks:</span>
          <span>{tasksAuthorized ? "Online" : "Ready"}</span>
        </div>

        <button
          type="button"
          onClick={() => onTabChange("settings")}
          className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 hover:text-black dark:hover:text-white transition-colors px-2 py-1"
        >
          Settings
        </button>

        <button
          type="button"
          onClick={onToggleDarkMode}
          title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
          className="p-1.5 rounded-xl text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );
};

export const EditorialFooter: React.FC = () => {
  const { activeEntries } = useWorkLog();
  const todayStr = new Date().toISOString().split("T")[0];
  const todayCount = activeEntries.filter((e) => e.date === todayStr).length;

  return (
    <footer className="h-12 bg-white dark:bg-zinc-900 border-t border-[#E5E7EB] dark:border-zinc-800 px-4 sm:px-8 flex items-center justify-between text-[11px] font-semibold text-gray-400 dark:text-zinc-500">
      <div className="flex items-center gap-4 sm:gap-6">
        <span className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          <span>{todayCount} {todayCount === 1 ? "Entry" : "Entries"} today</span>
        </span>
        <span className="hidden sm:inline">Free Tier: Spark</span>
      </div>

      <div className="flex items-center gap-3 sm:gap-4 uppercase tracking-widest text-[10px]">
        <span className="hidden md:inline">Web Speech API</span>
        <span className="text-zinc-900 dark:text-zinc-100 font-bold">Gemini AI</span>
      </div>
    </footer>
  );
};
