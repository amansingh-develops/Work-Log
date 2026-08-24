import React, { useState, useEffect } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { WorkLogProvider } from "./context/WorkLogContext";
import { Sidebar, HeaderBar, EditorialFooter, NavTab } from "./components/Navbar";
import { TodayView } from "./views/TodayView";
import { EntriesView } from "./views/EntriesView";
import { ProjectsView } from "./views/ProjectsView";
import { ReportsView } from "./views/ReportsView";
import { ActivityLogView } from "./views/ActivityLogView";
import { TrashView } from "./views/TrashView";
import { SettingsView } from "./views/SettingsView";
import {
  NotebookPen,
  Sparkles,
  Mic,
  FileDown,
  CheckSquare,
  LogIn,
  Loader2,
  Download,
  X,
} from "lucide-react";

const MainApp: React.FC<{
  darkMode: boolean;
  onToggleDarkMode: () => void;
}> = ({ darkMode, onToggleDarkMode }) => {
  const { user, loading: authLoading, login, loginGuest } = useAuth();
  const [activeTab, setActiveTab] = useState<NavTab>("today");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  // Handle PWA install prompt
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
  }, []);

  const handleInstallPwa = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-black dark:bg-white text-white dark:text-black flex items-center justify-center animate-pulse shadow-md">
            <div className="w-4 h-1 bg-white dark:bg-black rounded-full" />
          </div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-zinc-400">
            <Loader2 className="w-4 h-4 animate-spin text-zinc-600 dark:text-zinc-300" />
            <span>Loading Work Log...</span>
          </div>
        </div>
      </div>
    );
  }

  // If not signed in, show clean Google Sign-In gate in Editorial Aesthetic
  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-[#FAFAFA] dark:bg-zinc-950 text-[#111827] dark:text-zinc-100 font-sans">
        <div className="w-full max-w-md p-8 sm:p-10 bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E7EB] dark:border-zinc-800 shadow-sm space-y-6 text-center">
          {/* Logo */}
          <div className="w-12 h-12 rounded-xl bg-black dark:bg-white text-white dark:text-black flex items-center justify-center mx-auto shadow-xs">
            <div className="w-5 h-1.5 bg-white dark:bg-black rounded-full" />
          </div>

          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.25em]">
              Personal Workspace
            </span>
            <h1 className="text-3xl font-serif italic text-gray-900 dark:text-zinc-100">
              Work Log
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 leading-relaxed font-sans">
              Editorial daily work journal with 30s voice dictation, Gemini AI formatting, and mentor-ready export.
            </p>
          </div>

          {/* Value highlights */}
          <div className="grid grid-cols-2 gap-2 text-left text-xs text-gray-600 dark:text-zinc-400 pt-2">
            <div className="p-3 bg-[#F9FAFB] dark:bg-zinc-800/60 rounded-xl border border-[#E5E7EB] dark:border-zinc-700/60 flex items-center gap-2">
              <Mic className="w-4 h-4 text-black dark:text-white flex-shrink-0" />
              <span className="font-medium text-[11px]">30s Voice Dictation</span>
            </div>
            <div className="p-3 bg-[#F9FAFB] dark:bg-zinc-800/60 rounded-xl border border-[#E5E7EB] dark:border-zinc-700/60 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
              <span className="font-medium text-[11px]">AI Action Bullets</span>
            </div>
            <div className="p-3 bg-[#F9FAFB] dark:bg-zinc-800/60 rounded-xl border border-[#E5E7EB] dark:border-zinc-700/60 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <span className="font-medium text-[11px]">Google Tasks Sync</span>
            </div>
            <div className="p-3 bg-[#F9FAFB] dark:bg-zinc-800/60 rounded-xl border border-[#E5E7EB] dark:border-zinc-700/60 flex items-center gap-2">
              <FileDown className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <span className="font-medium text-[11px]">PDF & DOCX Export</span>
            </div>
          </div>

          {/* Sign in Button & Instant Guest Mode */}
          <div className="space-y-2.5">
            <button
              type="button"
              id="login-with-google-landing-btn"
              onClick={login}
              className="w-full flex items-center justify-center gap-2.5 px-5 py-3 text-sm font-semibold bg-black dark:bg-white text-white dark:text-black hover:bg-gray-800 dark:hover:bg-zinc-100 rounded-xl shadow-md hover:translate-y-[-1px] active:translate-y-[0px] transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In with Google</span>
            </button>

            <button
              type="button"
              id="login-as-guest-btn"
              onClick={loginGuest}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold text-zinc-600 dark:text-zinc-300 hover:text-black dark:hover:text-white bg-transparent hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-xl border border-dashed border-gray-300 dark:border-zinc-700 transition-colors cursor-pointer"
            >
              <span>Instant Guest Mode (No sign in needed)</span>
            </button>
          </div>

          <p className="text-[10px] uppercase font-bold tracking-widest text-gray-400">
            Protected Single-User Firestore & Google Tasks Sync
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAFAFA] dark:bg-zinc-950 text-[#111827] dark:text-zinc-100 flex flex-row overflow-x-hidden font-sans antialiased">
      {/* Desktop Editorial Sidebar */}
      <div className="hidden md:block">
        <Sidebar activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-50 w-72 bg-[#F3F4F6] dark:bg-zinc-900 shadow-2xl h-full flex flex-col justify-between">
            <div className="p-4 flex items-center justify-between border-b border-[#E5E7EB] dark:border-zinc-800">
              <span className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                Menu
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1 rounded-lg text-zinc-500 hover:text-black dark:hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <Sidebar
                activeTab={activeTab}
                onTabChange={(tab) => {
                  setActiveTab(tab);
                  setMobileMenuOpen(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content Viewport */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <HeaderBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          darkMode={darkMode}
          onToggleDarkMode={onToggleDarkMode}
          onOpenMobileMenu={() => setMobileMenuOpen(true)}
        />

        {/* PWA Install Banner */}
        {deferredPrompt && (
          <div className="bg-black text-white dark:bg-zinc-800 px-6 py-2.5 text-xs flex items-center justify-between gap-3 shadow-inner">
            <div className="flex items-center gap-2">
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Install Work Log to your home screen or desktop for rapid offline access.</span>
            </div>
            <button
              type="button"
              onClick={handleInstallPwa}
              className="px-3 py-1 bg-white text-black rounded-lg font-bold text-[11px] hover:bg-gray-100"
            >
              Install PWA
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <main className="flex-1 p-4 sm:p-8 bg-[#FAFAFA] dark:bg-zinc-950 overflow-y-auto">
          <div className="max-w-6xl mx-auto space-y-8">
            {activeTab === "today" && <TodayView onNavigate={setActiveTab} />}
            {activeTab === "entries" && <EntriesView />}
            {activeTab === "projects" && <ProjectsView />}
            {activeTab === "reports" && <ReportsView />}
            {activeTab === "activity" && <ActivityLogView />}
            {activeTab === "trash" && <TrashView />}
            {activeTab === "settings" && <SettingsView />}
          </div>
        </main>

        {/* Editorial Footer */}
        <EditorialFooter />
      </div>
    </div>
  );
};

export default function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const saved = localStorage.getItem("worklog_theme");
    if (saved) return saved === "dark";
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("worklog_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("worklog_theme", "light");
    }
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <AuthProvider>
      <WorkLogProvider>
        <MainApp darkMode={darkMode} onToggleDarkMode={toggleDarkMode} />
      </WorkLogProvider>
    </AuthProvider>
  );
}
