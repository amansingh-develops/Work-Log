import React, { useState } from "react";
import {
  FolderKanban,
  Plus,
  Edit2,
  Archive,
  ArchiveRestore,
  Trash2,
  Calendar,
  Layers,
  FileText,
} from "lucide-react";
import { useWorkLog } from "../context/WorkLogContext";
import { Project, getProjectColor } from "../types";
import { formatDate } from "../lib/utils";
import { ProjectModal } from "../components/ProjectModal";

export const ProjectsView: React.FC = () => {
  const {
    activeProjects,
    archivedProjects,
    activeEntries,
    archiveProject,
    deleteProject,
  } = useWorkLog();

  const [tab, setTab] = useState<"active" | "archived">("active");
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<Project | null>(null);

  const displayedProjects = tab === "active" ? activeProjects : archivedProjects;

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setSelectedProject(null);
    setIsModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirmProject) return;
    await deleteProject(deleteConfirmProject.id);
    setDeleteConfirmProject(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[11px] font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-[0.2em] mb-1">
            Taxonomy & Streams
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif italic text-gray-900 dark:text-zinc-100">
            Projects
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-zinc-400 mt-0.5 font-sans">
            Organize and tag your work logs across dedicated streams
          </p>
        </div>

        <button
          type="button"
          id="create-new-project-btn"
          onClick={handleCreate}
          className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold bg-black dark:bg-white text-white dark:text-black hover:opacity-90 rounded-xl shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>New Project</span>
        </button>
      </div>

      {/* Tabs: Active vs Archived */}
      <div className="flex items-center gap-2 border-b border-[#E5E7EB] dark:border-zinc-800 pb-2">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            tab === "active"
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white"
          }`}
        >
          Active Projects ({activeProjects.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("archived")}
          className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
            tab === "archived"
              ? "bg-black text-white dark:bg-white dark:text-black"
              : "text-gray-500 dark:text-zinc-400 hover:text-black dark:hover:text-white"
          }`}
        >
          Archived ({archivedProjects.length})
        </button>
      </div>

      {/* Projects Grid */}
      {displayedProjects.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-zinc-900/40 rounded-2xl border border-dashed border-[#E5E7EB] dark:border-zinc-800 shadow-xs">
          <FolderKanban className="w-10 h-10 text-gray-300 dark:text-zinc-700 mx-auto mb-3" />
          <h3 className="text-base font-serif italic text-gray-900 dark:text-zinc-100">
            {tab === "active" ? "No active projects" : "No archived projects"}
          </h3>
          <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto font-sans">
            {tab === "active"
              ? "Create your first project stream to start categorizing your daily tasks."
              : "Archived projects that are inactive will appear here."}
          </p>
          {tab === "active" && (
            <button
              type="button"
              onClick={handleCreate}
              className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-black dark:bg-white text-white dark:text-black rounded-xl hover:opacity-90 transition-opacity"
            >
              <Plus className="w-4 h-4" />
              Create Project
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {displayedProjects.map((proj) => {
            const colorTheme = getProjectColor(proj.colorTag);
            const entryCount = activeEntries.filter((e) => e.projectId === proj.id).length;

            return (
              <div
                key={proj.id}
                id={`project-card-${proj.id}`}
                className="group relative bg-white dark:bg-zinc-900 rounded-2xl border border-[#E5E7EB] dark:border-zinc-800 shadow-xs hover:shadow-sm hover:border-gray-300 dark:hover:border-zinc-700 transition-all p-6 flex flex-col justify-between"
              >
                <div>
                  {/* Top Color Tag & Actions */}
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border ${colorTheme.badgeClass}`}
                    >
                      <span className={`w-2 h-2 rounded-full ${colorTheme.dotClass}`} />
                      {colorTheme.name}
                    </span>

                    {/* Quick action buttons */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleEdit(proj)}
                        title="Edit project"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-black dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => archiveProject(proj.id, !proj.archived)}
                        title={proj.archived ? "Unarchive project" : "Archive project"}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-black dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-zinc-800 transition-colors"
                      >
                        {proj.archived ? (
                          <ArchiveRestore className="w-3.5 h-3.5" />
                        ) : (
                          <Archive className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmProject(proj)}
                        title="Delete project"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-zinc-800 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Project Title */}
                  <h3 className="text-lg font-serif italic text-gray-900 dark:text-zinc-100 mb-1">
                    {proj.name}
                  </h3>

                  {/* Description */}
                  {proj.description ? (
                    <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed mb-4 line-clamp-2 font-sans">
                      {proj.description}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-400 dark:text-zinc-500 italic mb-4 font-sans">
                      No description provided
                    </p>
                  )}
                </div>

                {/* Footer Metrics */}
                <div className="pt-3 border-t border-[#E5E7EB] dark:border-zinc-800 flex items-center justify-between text-xs text-gray-500 font-sans">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <FileText className="w-3.5 h-3.5 text-gray-400" />
                    <span>{entryCount} {entryCount === 1 ? "entry" : "entries"}</span>
                  </div>

                  <span className="text-[11px] text-gray-400">
                    Created {formatDate(proj.createdAt ? proj.createdAt.split("T")[0] : "")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Project Modal (Create/Edit) */}
      {isModalOpen && (
        <ProjectModal
          project={selectedProject}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-6 space-y-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
              Delete Project "{deleteConfirmProject.name}"?
            </h3>
            <p className="text-xs text-zinc-500 leading-relaxed">
              Are you sure you want to delete this project? Existing entries linked to this project will remain in your log as uncategorized.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmProject(null)}
                className="px-3.5 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors"
              >
                Delete Project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
