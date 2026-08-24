import React, { useState } from "react";
import { X, FolderPlus, Loader2, Check, AlertCircle } from "lucide-react";
import { Project, PROJECT_COLORS } from "../types";
import { useWorkLog } from "../context/WorkLogContext";

interface ProjectModalProps {
  project?: Project | null;
  onClose: () => void;
}

export const ProjectModal: React.FC<ProjectModalProps> = ({ project, onClose }) => {
  const { createProject, updateProject } = useWorkLog();

  const [name, setName] = useState(project?.name || "");
  const [colorTag, setColorTag] = useState(project?.colorTag || "emerald");
  const [description, setDescription] = useState(project?.description || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || isSubmitting) {
      if (!name.trim()) setErrorMessage("Project name is required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (project) {
        await updateProject(project.id, {
          name: name.trim(),
          colorTag,
          description: description.trim(),
        });
      } else {
        await createProject(name.trim(), colorTag, description.trim());
      }
      setIsSaved(true);
      setTimeout(() => {
        onClose();
      }, 500);
    } catch (err: any) {
      console.error("Failed to save project:", err);
      setErrorMessage(err?.message || "Failed to save project. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        id="project-modal"
        className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {project ? "Edit Project" : "New Project"}
              </h3>
              <p className="text-xs text-zinc-500">
                Organize your work entries into clear streams
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Project Name */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Project Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              id="project-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Core Engine, API v2, Mobile App"
              required
              className="w-full px-3 py-2 text-sm bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10"
            />
          </div>

          {/* Color Selection */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Project Color Tag
            </label>
            <div className="grid grid-cols-4 gap-2">
              {PROJECT_COLORS.map((col) => {
                const isSelected = colorTag === col.value;
                return (
                  <button
                    key={col.value}
                    type="button"
                    onClick={() => setColorTag(col.value)}
                    className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium border transition-all ${
                      isSelected
                        ? "border-zinc-900 dark:border-zinc-100 ring-2 ring-zinc-900/10 dark:ring-zinc-100/10 bg-zinc-50 dark:bg-zinc-800"
                        : "border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600"
                    }`}
                  >
                    <span className={`w-3.5 h-3.5 rounded-full ${col.dotClass} flex-shrink-0 flex items-center justify-center`}>
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </span>
                    <span className="truncate text-zinc-700 dark:text-zinc-300">{col.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">
              Description <span className="text-zinc-400 font-normal">(Optional)</span>
            </label>
            <textarea
              rows={2}
              id="project-description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Key objectives, repository, or scope notes..."
              className="w-full p-3 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-hidden focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10"
            />
          </div>

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3 text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 rounded-xl border border-rose-200 dark:border-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              id="project-submit-btn"
              disabled={isSubmitting || isSaved || !name.trim()}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl shadow-xs transition-all disabled:opacity-50 ${
                isSaved
                  ? "bg-emerald-600 dark:bg-emerald-500 text-white font-bold"
                  : "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-white"
              }`}
            >
              {isSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white animate-in zoom-in" />
                  <span>Saved!</span>
                </>
              ) : isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>{project ? "Save Project" : "Create Project"}</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
