import { useState } from 'react';
import { TaskResponse } from '@pulse/shared-types';
import { X, ExternalLink } from 'lucide-react';

interface ImpactGalleryProps {
  /** Array of tasks to filter for photographic proof */
  tasks: TaskResponse[];
}

/** Helper function to safely extract GDrive URL from task object (handles casing variations) */
const getGDriveUrl = (task: TaskResponse): string | null => {
  const task_any = task as any;
  return task_any.gdrive_web_url || task_any.gdriveWebUrl || null;
};

/** Helper function to format date for display */
const formatDate = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'Date Unknown';
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return 'Date Unknown';
  }
};

/**
 * ImpactGallery Component
 *
 * A high-impact photo gallery designed for executive leadership and donors to verify
 * physical outcomes. Displays tasks with valid photographic proof in a responsive grid.
 *
 * Features:
 * - Automatic filtering of tasks with valid GDrive URLs
 * - Responsive multi-column layout (1 mobile, 2 tablet, 3-4 desktop)
 * - Interactive lightbox modal with high-resolution preview
 * - Defensive rendering with proper type checking
 * - Full light/dark mode support with WCAG AAA contrast
 */
export default function ImpactGallery({ tasks }: ImpactGalleryProps) {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // ============= DEFENSIVE RENDERING =============
  if (!Array.isArray(tasks)) {
    console.warn('ImpactGallery received invalid tasks prop:', tasks);
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 dark:text-slate-400">
          No tasks available for gallery display.
        </p>
      </div>
    );
  }

  // ============= FILTER TASKS WITH VALID GDRIVE URLS =============
  const tasksWithPhotos = tasks.filter((task) => {
    const url = getGDriveUrl(task);
    return url && typeof url === 'string' && url.length > 0;
  });

  if (tasksWithPhotos.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 dark:text-slate-400">
          No photographic proof available yet. As tasks are completed with photo uploads,
          they will appear here.
        </p>
      </div>
    );
  }

  const selectedTask = tasksWithPhotos.find((t) => t.id === selectedTaskId);

  return (
    <div className="space-y-6">
      {/* ============= GALLERY HEADER ============= */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Impact Gallery
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
            {tasksWithPhotos.length} photo{tasksWithPhotos.length !== 1 ? 's' : ''} documenting field outcomes
          </p>
        </div>
      </div>

      {/* ============= RESPONSIVE GRID LAYOUT ============= */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {tasksWithPhotos.map((task) => {
          const photoUrl = getGDriveUrl(task);
          const displayDate = formatDate(task.updated_at || task.created_at);
          const officerName = (task as any).assigned_to_name || (task as any).assigned_to || 'Unknown Officer';

          return (
            <div
              key={task.id}
              className="group relative bg-white dark:bg-slate-800 rounded-lg overflow-hidden shadow-md hover:shadow-xl transition-shadow duration-300 cursor-pointer"
              onClick={() => setSelectedTaskId(task.id)}
            >
              {/* ============= PHOTO CARD IMAGE ============= */}
              {photoUrl && (
                <div className="relative h-48 overflow-hidden bg-slate-100 dark:bg-slate-700">
                  <img
                    src={photoUrl}
                    alt={task.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23e2e8f0" width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" font-size="16" text-anchor="middle" dy=".3em" fill="%23888"%3EImage not available%3C/text%3E%3C/svg%3E';
                    }}
                  />
                </div>
              )}

              {/* ============= CARD CONTENT (TITLE + METADATA) ============= */}
              <div className="p-4 space-y-3">
                {/* Task Title */}
                <h3 className="text-slate-900 dark:text-white font-semibold line-clamp-2 group-hover:underline group-hover:underline-offset-2 transition-all">
                  {task.name}
                </h3>

                {/* Metadata Row: Date + Officer Badge */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    {displayDate}
                  </span>
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-emerald-100/80 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-200">
                    {officerName.substring(0, 12)}
                  </span>
                </div>
              </div>

              {/* ============= HOVER OVERLAY (SUBTLE) ============= */}
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/30 dark:from-slate-950/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          );
        })}
      </div>

      {/* ============= LIGHTBOX MODAL ============= */}
      {selectedTask && (
        <LightboxModal
          task={selectedTask}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}

// ============= LIGHTBOX MODAL COMPONENT =============
interface LightboxModalProps {
  task: TaskResponse;
  onClose: () => void;
}

/**
 * High-contrast modal overlay for viewing full-resolution photographic proof.
 * Features responsive sizing and keyboard/click-to-close interactions.
 */
function LightboxModal({ task, onClose }: LightboxModalProps) {
  const photoUrl = getGDriveUrl(task);
  const displayDate = formatDate(task.updated_at || task.created_at);

  if (!photoUrl) return null;

  return (
    <>
      {/* ============= BACKDROP (DARK OPACITY) ============= */}
      <div
        className="fixed inset-0 bg-slate-950/80 dark:bg-slate-950/95 z-40 backdrop-blur-sm"
        onClick={onClose}
        role="button"
        tabIndex={0}
        aria-label="Close lightbox"
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose();
        }}
      />

      {/* ============= MODAL CONTAINER ============= */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="relative max-w-4xl max-h-[90vh] bg-slate-900 dark:bg-slate-950 rounded-lg overflow-hidden shadow-2xl">
          {/* ============= IMAGE VIEWER ============= */}
          <div className="relative h-full flex items-center justify-center bg-slate-800 dark:bg-slate-900">
            <img
              src={photoUrl}
              alt={task.name}
              className="max-w-full max-h-[85vh] object-contain"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600"%3E%3Crect fill="%231e293b" width="800" height="600"/%3E%3Ctext x="50%25" y="50%25" font-size="24" text-anchor="middle" dy=".3em" fill="%23888"%3EImage not available%3C/text%3E%3C/svg%3E';
              }}
            />
          </div>

          {/* ============= CLOSE BUTTON (TOP RIGHT) ============= */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/80 dark:bg-slate-950/80 text-white hover:bg-slate-800 dark:hover:bg-slate-900 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
            aria-label="Close lightbox"
          >
            <X className="w-5 h-5" />
          </button>

          {/* ============= FOOTER INFO + GDRIVE LINK ============= */}
          <div className="bg-slate-900 dark:bg-slate-950 px-6 py-4 border-t border-slate-700 dark:border-slate-800 flex items-center justify-between gap-4">
            <div className="space-y-1 min-w-0 flex-1">
              <h3 className="text-white font-semibold line-clamp-1">
                {task.name}
              </h3>
              <p className="text-sm text-slate-400">
                Uploaded {displayDate}
              </p>
            </div>

            {/* Open in GDrive Link */}
            <a
              href={photoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-950"
            >
              <ExternalLink className="w-4 h-4" />
              Open in Drive
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
