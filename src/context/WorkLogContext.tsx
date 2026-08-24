import React, { createContext, useContext, useEffect, useState, useMemo, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  setDoc,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
  orderBy,
  limit,
} from "firebase/firestore";
import { db, auth, handleFirestoreError, OperationType, getGoogleAccessToken } from "../lib/firebase";
import { useAuth } from "./AuthContext";
import { Project, WorkEntry, ActivityLog, ActivityAction, ActiveVersion } from "../types";
import { enhanceWorkLogText } from "../services/api";
import { createGoogleTask } from "../services/googleTasks";
import { formatDate, getTodayString, sanitizeFirestorePayload } from "../lib/utils";

interface WorkLogContextType {
  projects: Project[];
  activeProjects: Project[];
  archivedProjects: Project[];
  projectsMap: Map<string, Project>;
  entries: WorkEntry[];
  activeEntries: WorkEntry[];
  deletedEntries: WorkEntry[];
  activityLogs: ActivityLog[];
  lastUsedProjectId: string;
  loading: boolean;
  createProject: (name: string, colorTag: string, description?: string) => Promise<string>;
  updateProject: (id: string, updates: Partial<Project>) => Promise<void>;
  archiveProject: (id: string, archived: boolean) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  createEntry: (payload: {
    projectId: string;
    date: string;
    text: string;
    tags: string[];
    source: "voice" | "text";
    enhanceWithAi: boolean;
  }) => Promise<WorkEntry>;
  updateEntry: (id: string, updates: Partial<WorkEntry>) => Promise<void>;
  toggleActiveVersion: (id: string) => Promise<void>;
  enhanceEntry: (id: string) => Promise<void>;
  softDeleteEntry: (id: string) => Promise<void>;
  restoreEntry: (id: string) => Promise<void>;
  permanentlyDeleteEntry: (id: string) => Promise<void>;
  scheduleFollowUp: (entryId: string, taskTitle: string, dueDate?: string) => Promise<void>;
  logActivity: (action: ActivityAction, changeSummary: string, entryId?: string) => Promise<void>;
  clearActivityLogs: () => Promise<void>;
  setLastUsedProjectId: (id: string) => void;
}

const WorkLogContext = createContext<WorkLogContextType | undefined>(undefined);

export const WorkLogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [entries, setEntries] = useState<WorkEntry[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastUsedProjectId, setLastUsedProjectIdState] = useState<string>(() => {
    return localStorage.getItem("worklog_last_project_id") || "";
  });
  const starterCreatedRef = useRef<boolean>(false);

  const setLastUsedProjectId = (id: string) => {
    setLastUsedProjectIdState(id);
    localStorage.setItem("worklog_last_project_id", id);
  };

  // Helper to record activity log with optimistic UI updates
  const logActivity = async (
    action: ActivityAction,
    changeSummary: string,
    entryId?: string
  ) => {
    const currentUser = user || auth.currentUser;
    const nowIso = new Date().toISOString();
    
    // Generate real or local ID
    const logRef = currentUser ? doc(collection(db, "activityLog")) : null;
    const logId = logRef ? logRef.id : "log-" + Date.now() + "-" + Math.random().toString(36).substring(2, 7);

    const newLog: ActivityLog = {
      id: logId,
      ownerId: currentUser?.uid || "guest",
      entryId: entryId || undefined,
      action,
      timestamp: nowIso,
      changeSummary,
    };

    // Optimistically update local activity state immediately
    setActivityLogs((prev) => {
      // Prevent exact duplicate spam within 1 second
      if (prev.length > 0 && prev[0].changeSummary === changeSummary && prev[0].action === action) {
        return prev;
      }
      return [newLog, ...prev];
    });

    if (!currentUser || !logRef) return;

    try {
      const payload = sanitizeFirestorePayload({
        ownerId: currentUser.uid,
        entryId: entryId || null,
        action,
        timestamp: nowIso,
        changeSummary,
      });

      setDoc(logRef, payload).catch((err) => {
        console.warn("Failed to write activity log to Firestore, preserved locally:", err);
      });
    } catch (err) {
      console.warn("Activity log error:", err);
    }
  };

  // Clear all activity logs
  const clearActivityLogs = async () => {
    const currentUser = user || auth.currentUser;
    const previousLogs = [...activityLogs];
    setActivityLogs([]);

    if (!currentUser) return;

    try {
      const q = query(
        collection(db, "activityLog"),
        where("ownerId", "==", currentUser.uid)
      );
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map((docSnap) => deleteDoc(docSnap.ref));
      await Promise.all(deletePromises);
      await logActivity("system", "Activity audit log history cleared");
    } catch (err) {
      console.error("Failed to clear activity logs from Firestore:", err);
      setActivityLogs(previousLogs);
      throw err;
    }
  };

  // Real-time listener for Projects
  useEffect(() => {
    if (!user) {
      setProjects([]);
      starterCreatedRef.current = false;
      return;
    }

    const q = query(collection(db, "projects"), where("ownerId", "==", user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const projs: Project[] = [];
        snapshot.forEach((docSnap) => {
          projs.push({ id: docSnap.id, ...(docSnap.data() as Omit<Project, "id">) });
        });
        projs.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        setProjects(projs);

        // If no default project exists yet, auto-create a starter project "General Work" once
        if (projs.length === 0 && !snapshot.metadata.hasPendingWrites && !starterCreatedRef.current) {
          starterCreatedRef.current = true;
          createStarterProject(user.uid);
        } else if (!lastUsedProjectId && projs.length > 0) {
          const firstActive = projs.find((p) => !p.archived);
          if (firstActive) setLastUsedProjectId(firstActive.id);
        }
      },
      (error) => {
        console.error("Error fetching projects:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Starter project creation helper
  const createStarterProject = async (ownerId: string): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, "projects"), {
        ownerId,
        name: "General Work",
        colorTag: "emerald",
        description: "Default daily workspace project",
        archived: false,
        createdAt: new Date().toISOString(),
      });
      setLastUsedProjectId(docRef.id);
      logActivity("create", 'Initialized starter project "General Work"');
      return docRef.id;
    } catch (e) {
      console.error("Failed to create starter project:", e);
      return "";
    }
  };

  // Real-time listener for Entries
  useEffect(() => {
    if (!user) {
      setEntries([]);
      setLoading(false);
      return;
    }

    const q = query(collection(db, "entries"), where("ownerId", "==", user.uid));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ents: WorkEntry[] = [];
        snapshot.forEach((docSnap) => {
          ents.push({ id: docSnap.id, ...(docSnap.data() as Omit<WorkEntry, "id">) });
        });
        // Sort descending by date and createdAt
        ents.sort((a, b) => {
          if (a.date !== b.date) return b.date.localeCompare(a.date);
          return (b.createdAt || "").localeCompare(a.createdAt || "");
        });
        setEntries(ents);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching entries:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Real-time listener for Activity Logs
  useEffect(() => {
    if (!user) {
      setActivityLogs([]);
      return;
    }

    const q = query(
      collection(db, "activityLog"),
      where("ownerId", "==", user.uid),
      limit(200)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const logs: ActivityLog[] = [];
        snapshot.forEach((docSnap) => {
          logs.push({ id: docSnap.id, ...(docSnap.data() as Omit<ActivityLog, "id">) });
        });
        logs.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
        setActivityLogs((prev) => {
          // Keep pending local logs that haven't landed in snapshot yet
          const pending = prev.filter(
            (l) => l.id.startsWith("log-") && !logs.some(
              (sl) => sl.changeSummary === l.changeSummary && Math.abs(new Date(sl.timestamp).getTime() - new Date(l.timestamp).getTime()) < 3000
            )
          );
          const merged = [...logs, ...pending];
          merged.sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""));
          return merged;
        });
      },
      (error) => {
        console.error("Error fetching activity logs:", error);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Derived maps and lists
  const projectsMap = useMemo(() => {
    const map = new Map<string, Project>();
    for (const p of projects) {
      map.set(p.id, p);
    }
    return map;
  }, [projects]);

  const activeProjects = useMemo(() => projects.filter((p) => !p.archived), [projects]);
  const archivedProjects = useMemo(() => projects.filter((p) => p.archived), [projects]);

  const activeEntries = useMemo(() => entries.filter((e) => !e.deleted), [entries]);
  const deletedEntries = useMemo(() => entries.filter((e) => e.deleted), [entries]);

  // Project operations
  const createProject = async (name: string, colorTag: string, description?: string): Promise<string> => {
    const currentUser = user || auth.currentUser;
    if (!currentUser) throw new Error("User not authenticated");

    const trimmedName = name.trim();
    const projRef = doc(collection(db, "projects"));
    const projId = projRef.id;

    const newProjData: Omit<Project, "id"> = {
      ownerId: currentUser.uid,
      name: trimmedName,
      colorTag: colorTag || "emerald",
      description: description?.trim() || "",
      archived: false,
      createdAt: new Date().toISOString(),
    };

    const sanitizedData = sanitizeFirestorePayload(newProjData);

    // Optimistic UI update so dialog and selects update instantly
    setProjects((prev) => [{ id: projId, ...sanitizedData }, ...prev.filter((p) => p.name !== trimmedName)]);
    setLastUsedProjectId(projId);

    // Persist to Firestore
    setDoc(projRef, sanitizedData).catch((err: any) => {
      console.error("Firestore project creation failed:", err);
    });

    logActivity("create", `Created project "${trimmedName}"`).catch((e) =>
      console.warn("Activity log background error:", e)
    );

    return projId;
  };

  const updateProject = async (id: string, updates: Partial<Project>) => {
    const currentUser = user || auth.currentUser;
    if (!currentUser) return;
    const current = projectsMap.get(id);

    // Optimistic update
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p))
    );

    try {
      const docRef = doc(db, "projects", id);
      updateDoc(docRef, sanitizeFirestorePayload(updates)).catch((err) => {
        console.error("Failed to update project in Firestore:", err);
      });
      logActivity(
        "update",
        `Updated project "${updates.name || current?.name || "Project"}"`
      ).catch((e) => console.warn("Activity log background error:", e));
    } catch (err) {
      console.error("Failed to update project:", err);
    }
  };

  const archiveProject = async (id: string, archived: boolean) => {
    const currentUser = user || auth.currentUser;
    if (!currentUser) return;
    const current = projectsMap.get(id);

    // Optimistic update
    setProjects((prev) =>
      prev.map((p) => (p.id === id ? { ...p, archived } : p))
    );

    try {
      const docRef = doc(db, "projects", id);
      updateDoc(docRef, { archived }).catch((err) => {
        console.error("Failed to update project archive status:", err);
      });
      logActivity(
        "update",
        `${archived ? "Archived" : "Restored"} project "${current?.name || "Project"}"`
      ).catch((e) => console.warn("Activity log background error:", e));
    } catch (err) {
      console.error("Failed to update project archive status:", err);
    }
  };

  const deleteProject = async (id: string) => {
    const currentUser = user || auth.currentUser;
    if (!currentUser) return;
    const current = projectsMap.get(id);

    // Optimistic delete
    setProjects((prev) => prev.filter((p) => p.id !== id));

    try {
      const docRef = doc(db, "projects", id);
      deleteDoc(docRef).catch((err) => {
        console.error("Failed to delete project from Firestore:", err);
      });
      logActivity("delete", `Deleted project "${current?.name || "Project"}"`).catch(
        (e) => console.warn("Activity log background error:", e)
      );
    } catch (err) {
      console.error("Failed to delete project from Firestore:", err);
    }
  };

  // Entry operations
  const createEntry = async ({
    projectId,
    date,
    text,
    tags,
    source,
    enhanceWithAi,
  }: {
    projectId: string;
    date: string;
    text: string;
    tags: string[];
    source: "voice" | "text";
    enhanceWithAi: boolean;
  }): Promise<WorkEntry> => {
    if (!user) throw new Error("User not authenticated");

    let effectiveProjectId = projectId;
    if (!effectiveProjectId || !projectsMap.has(effectiveProjectId)) {
      if (activeProjects.length > 0) {
        effectiveProjectId = activeProjects[0].id;
      } else {
        effectiveProjectId = await createStarterProject(user.uid);
      }
    }

    const project = projectsMap.get(effectiveProjectId);
    const projName = project?.name || "General Work";

    let enhancedText: string | undefined = undefined;
    let activeVersion: ActiveVersion = "raw";

    if (enhanceWithAi && text.trim()) {
      try {
        enhancedText = await enhanceWorkLogText({
          text,
          projectName: projName,
          tags,
        });
        activeVersion = "enhanced";
      } catch (err) {
        console.warn("AI enhancement failed on create, saving raw text:", err);
      }
    }

    const now = new Date().toISOString();
    const entryRef = doc(collection(db, "entries"));
    const entryId = entryRef.id;

    const newEntryData: Record<string, any> = {
      ownerId: user.uid,
      projectId: effectiveProjectId,
      date,
      rawText: text.trim(),
      activeVersion,
      tags,
      source,
      scheduledTaskId: null,
      deleted: false,
      deletedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    if (enhancedText) {
      newEntryData.enhancedText = enhancedText;
    }

    const payload = sanitizeFirestorePayload(newEntryData);

    const createdEntry: WorkEntry = {
      id: entryId,
      ...(newEntryData as Omit<WorkEntry, "id">),
    };

    // Optimistic UI update so user immediately sees entry in list
    setEntries((prev) => [createdEntry, ...prev.filter((e) => e.id !== entryId)]);
    if (effectiveProjectId) {
      setLastUsedProjectId(effectiveProjectId);
    }

    // Persist to Firestore asynchronously
    setDoc(entryRef, payload).catch((err: any) => {
      console.error("Firestore entry creation failed:", err);
    });

    logActivity(
      "create",
      `Logged ${source === "voice" ? "voice" : "text"} entry for "${projName}" on ${formatDate(date)}`,
      entryId
    ).catch((e) => console.warn("Background activity log error:", e));

    return createdEntry;
  };

  const updateEntry = async (id: string, updates: Partial<WorkEntry>) => {
    const currentUser = user || auth.currentUser;
    if (!currentUser) return;
    const now = new Date().toISOString();
    const payload = sanitizeFirestorePayload({ ...updates, updatedAt: now });

    const current = entries.find((e) => e.id === id);
    const proj = current ? projectsMap.get(updates.projectId || current.projectId) : undefined;
    const entryDate = updates.date || current?.date || getTodayString();

    // Optimistic update
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updates, updatedAt: now } : e))
    );

    try {
      const docRef = doc(db, "entries", id);
      updateDoc(docRef, payload).catch((err) => {
        console.error("Failed to update entry in Firestore:", err);
      });

      const summary = updates.activeVersion && updates.activeVersion !== current?.activeVersion
        ? `Switched active version to ${updates.activeVersion === "enhanced" ? "AI Enhanced" : "Raw"} for "${proj?.name || "Project"}"`
        : `Updated entry for "${proj?.name || "Project"}" on ${formatDate(entryDate)}`;

      logActivity("update", summary, id).catch((e) =>
        console.warn("Background log error:", e)
      );
    } catch (err) {
      console.error("Failed to update entry:", err);
    }
  };

  const toggleActiveVersion = async (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;
    const nextVersion: ActiveVersion = entry.activeVersion === "enhanced" ? "raw" : "enhanced";
    await updateEntry(id, { activeVersion: nextVersion });
  };

  const enhanceEntry = async (id: string) => {
    const entry = entries.find((e) => e.id === id);
    if (!entry) return;

    const project = projectsMap.get(entry.projectId);
    const enhanced = await enhanceWorkLogText({
      text: entry.rawText,
      projectName: project?.name,
      tags: entry.tags,
    });

    const now = new Date().toISOString();
    setEntries((prev) =>
      prev.map((e) =>
        e.id === id
          ? { ...e, enhancedText: enhanced, activeVersion: "enhanced", updatedAt: now }
          : e
      )
    );

    try {
      const docRef = doc(db, "entries", id);
      updateDoc(
        docRef,
        sanitizeFirestorePayload({
          enhancedText: enhanced,
          activeVersion: "enhanced",
          updatedAt: now,
        })
      ).catch((err) => {
        console.error("Failed to update enhanced text in Firestore:", err);
      });

      logActivity(
        "update",
        `Enhanced work log text with Gemini AI for "${project?.name || "Project"}"`,
        id
      ).catch((e) => console.warn("Background log error:", e));
    } catch (err) {
      console.error("Failed to update enhanced text:", err);
    }
  };

  const softDeleteEntry = async (id: string) => {
    if (!user) return;
    const entry = entries.find((e) => e.id === id);
    const project = entry ? projectsMap.get(entry.projectId) : undefined;
    const now = new Date().toISOString();

    // Optimistic delete
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, deleted: true, deletedAt: now } : e))
    );

    try {
      const docRef = doc(db, "entries", id);
      updateDoc(docRef, {
        deleted: true,
        deletedAt: now,
        updatedAt: now,
      }).catch((err) => {
        console.error("Failed to soft-delete entry in Firestore:", err);
      });
      logActivity(
        "delete",
        `Moved entry (${formatDate(entry?.date || "")}) for "${project?.name || "Project"}" to Trash`,
        id
      ).catch((e) => console.warn("Background log error:", e));
    } catch (err) {
      console.error("Failed to soft-delete entry:", err);
    }
  };

  const restoreEntry = async (id: string) => {
    if (!user) return;
    const entry = entries.find((e) => e.id === id);
    const project = entry ? projectsMap.get(entry.projectId) : undefined;
    const now = new Date().toISOString();

    // Optimistic restore
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, deleted: false, deletedAt: null } : e))
    );

    try {
      const docRef = doc(db, "entries", id);
      updateDoc(docRef, {
        deleted: false,
        deletedAt: null,
        updatedAt: now,
      }).catch((err) => {
        console.error("Failed to restore entry in Firestore:", err);
      });
      logActivity(
        "restore",
        `Restored entry (${formatDate(entry?.date || "")}) for "${project?.name || "Project"}" from Trash`,
        id
      ).catch((e) => console.warn("Background log error:", e));
    } catch (err) {
      console.error("Failed to restore entry:", err);
    }
  };

  const permanentlyDeleteEntry = async (id: string) => {
    if (!user) return;
    const entry = entries.find((e) => e.id === id);
    const project = entry ? projectsMap.get(entry.projectId) : undefined;

    // Optimistic delete
    setEntries((prev) => prev.filter((e) => e.id !== id));

    try {
      const docRef = doc(db, "entries", id);
      deleteDoc(docRef).catch((err) => {
        console.error("Failed to permanently delete entry in Firestore:", err);
      });
      logActivity(
        "delete",
        `Permanently deleted entry (${formatDate(entry?.date || "")}) for "${project?.name || "Project"}"`,
        id
      ).catch((e) => console.warn("Background log error:", e));
    } catch (err) {
      console.error("Failed to permanently delete entry:", err);
    }
  };

  const scheduleFollowUp = async (
    entryId: string,
    taskTitle: string,
    dueDate?: string,
    forceLocal = false
  ) => {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) throw new Error("Entry not found");

    const project = projectsMap.get(entry.projectId);
    const projName = project?.name || "General";

    const textToUse =
      entry.activeVersion === "enhanced" && entry.enhancedText
        ? entry.enhancedText
        : entry.rawText;

    let taskId = `task_${Date.now()}`;
    let isGoogleSync = false;

    // Check if Google Tasks token is available and not forced local
    const token = getGoogleAccessToken();
    if (token && !forceLocal) {
      try {
        const taskResult = await createGoogleTask({
          title: taskTitle.trim(),
          notes: `Follow-up for Work Log\nProject: ${projName}\nDate: ${entry.date}\n\nLog Content:\n${textToUse}`,
          dueDate,
        });
        taskId = taskResult.id;
        isGoogleSync = true;
      } catch (err: any) {
        console.warn("Google Tasks API sync failed, saving follow-up locally:", err);
        if (!forceLocal && !token) {
          throw err;
        }
      }
    }

    await updateEntry(entryId, {
      scheduledTaskId: taskId,
      scheduledTaskTitle: taskTitle.trim(),
      scheduledTaskDue: dueDate || undefined,
    });

    await logActivity(
      "schedule_task",
      `Scheduled ${isGoogleSync ? "Google" : "linked"} follow-up task: "${taskTitle.trim()}" (Due: ${dueDate ? formatDate(dueDate) : "No date"})`,
      entryId
    );
  };

  return (
    <WorkLogContext.Provider
      value={{
        projects,
        activeProjects,
        archivedProjects,
        projectsMap,
        entries,
        activeEntries,
        deletedEntries,
        activityLogs,
        lastUsedProjectId,
        loading,
        createProject,
        updateProject,
        archiveProject,
        deleteProject,
        createEntry,
        updateEntry,
        toggleActiveVersion,
        enhanceEntry,
        softDeleteEntry,
        restoreEntry,
        permanentlyDeleteEntry,
        scheduleFollowUp,
        logActivity,
        clearActivityLogs,
        setLastUsedProjectId,
      }}
    >
      {children}
    </WorkLogContext.Provider>
  );
};

export const useWorkLog = () => {
  const context = useContext(WorkLogContext);
  if (!context) {
    throw new Error("useWorkLog must be used within a WorkLogProvider");
  }
  return context;
};
