export interface Project {
  id: string;
  ownerId: string;
  name: string;
  colorTag: string; // e.g. 'emerald', 'blue', 'purple', 'amber', 'rose', 'indigo', 'teal', 'orange'
  description?: string;
  archived: boolean;
  createdAt: string;
}

export type EntrySource = "voice" | "text";
export type ActiveVersion = "raw" | "enhanced";

export interface WorkEntry {
  id: string;
  ownerId: string;
  projectId: string;
  date: string; // YYYY-MM-DD
  rawText: string;
  enhancedText?: string;
  activeVersion: ActiveVersion;
  tags: string[];
  source: EntrySource;
  scheduledTaskId?: string | null;
  scheduledTaskTitle?: string;
  scheduledTaskDue?: string;
  deleted: boolean;
  deletedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type ActivityAction =
  | "create"
  | "update"
  | "delete"
  | "restore"
  | "schedule_task"
  | "export"
  | "tag"
  | "system";

export interface ActivityLog {
  id: string;
  ownerId: string;
  entryId?: string;
  action: ActivityAction;
  timestamp: string;
  changeSummary: string;
}

export interface UserProfile {
  userId: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  defaultEnhanceOn: boolean;
  tagList: string[];
}

export interface ReportFilter {
  projectId: string; // 'all' or specific projectId
  startDate: string;
  endDate: string;
  format: "pdf" | "docx" | "txt";
}

export const DEFAULT_TAGS = [
  "feature",
  "bug fix",
  "meeting",
  "blocker",
  "research",
  "review",
  "refactor",
  "planning",
  "documentation",
  "ops",
];

export interface ProjectColorOption {
  name: string;
  value: string;
  bgClass: string;
  textClass: string;
  borderClass: string;
  dotClass: string;
  badgeClass: string;
}

export const PROJECT_COLORS: ProjectColorOption[] = [
  {
    name: "Emerald",
    value: "emerald",
    bgClass: "bg-emerald-500/10",
    textClass: "text-emerald-700 dark:text-emerald-300",
    borderClass: "border-emerald-500/30",
    dotClass: "bg-emerald-500",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800",
  },
  {
    name: "Sky Blue",
    value: "sky",
    bgClass: "bg-sky-500/10",
    textClass: "text-sky-700 dark:text-sky-300",
    borderClass: "border-sky-500/30",
    dotClass: "bg-sky-500",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800",
  },
  {
    name: "Violet",
    value: "violet",
    bgClass: "bg-violet-500/10",
    textClass: "text-violet-700 dark:text-violet-300",
    borderClass: "border-violet-500/30",
    dotClass: "bg-violet-500",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:border-violet-800",
  },
  {
    name: "Amber",
    value: "amber",
    bgClass: "bg-amber-500/10",
    textClass: "text-amber-700 dark:text-amber-300",
    borderClass: "border-amber-500/30",
    dotClass: "bg-amber-500",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800",
  },
  {
    name: "Rose",
    value: "rose",
    bgClass: "bg-rose-500/10",
    textClass: "text-rose-700 dark:text-rose-300",
    borderClass: "border-rose-500/30",
    dotClass: "bg-rose-500",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-800",
  },
  {
    name: "Indigo",
    value: "indigo",
    bgClass: "bg-indigo-500/10",
    textClass: "text-indigo-700 dark:text-indigo-300",
    borderClass: "border-indigo-500/30",
    dotClass: "bg-indigo-500",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-800",
  },
  {
    name: "Teal",
    value: "teal",
    bgClass: "bg-teal-500/10",
    textClass: "text-teal-700 dark:text-teal-300",
    borderClass: "border-teal-500/30",
    dotClass: "bg-teal-500",
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800",
  },
  {
    name: "Orange",
    value: "orange",
    bgClass: "bg-orange-500/10",
    textClass: "text-orange-700 dark:text-orange-300",
    borderClass: "border-orange-500/30",
    dotClass: "bg-orange-500",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-800",
  },
];

export const getProjectColor = (colorTag?: string): ProjectColorOption => {
  return (
    PROJECT_COLORS.find((c) => c.value === colorTag) || PROJECT_COLORS[0]
  );
};
