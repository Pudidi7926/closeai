import React from 'react';
import { Folder, Plus, ChevronRight, MoreHorizontal, Trash2 } from 'lucide-react';
import { Project } from '../types';
import { cn } from '../lib/utils';

interface ProjectManagerProps {
  projects: Project[];
  activeProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  onCreateProject: () => void;
  onDeleteProject: (id: string) => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDeleteProject
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.2em] text-gray-400">Proyek</h3>
        <button 
          onClick={onCreateProject}
          className="p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded-md transition-colors"
        >
          <Plus className="w-4 h-4 text-gray-400" />
        </button>
      </div>

      <div className="space-y-1">
        <button
          onClick={() => onSelectProject(null)}
          className={cn(
            "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all",
            activeProjectId === null ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "hover:bg-gray-100 dark:hover:bg-white/5"
          )}
        >
          <Folder className="w-4 h-4 shrink-0" />
          Semua Chat
        </button>

        {projects.map(project => (
          <div key={project.id} className="group relative">
            <button
              onClick={() => onSelectProject(project.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all text-left",
                activeProjectId === project.id ? "bg-orange-500 text-white shadow-lg shadow-orange-500/20" : "hover:bg-gray-100 dark:hover:bg-white/5"
              )}
            >
              <Folder className="w-4 h-4 shrink-0" />
              <span className="truncate flex-1">{project.name}</span>
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if(confirm('Hapus proyek ini? Chat di dalamnya akan dipindahkan ke Semua Chat.')) {
                  onDeleteProject(project.id);
                }
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 hover:text-red-500 rounded-lg transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
