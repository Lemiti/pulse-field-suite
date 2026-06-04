import type { SyncPushRequest, SyncTaskUpdate } from '@pulse/shared-types';

export const PENDING_SYNC_QUEUE_KEY = 'pending_sync_queue';

export type PendingSyncQueueItem = {
  id: string;
  queued_at: number;
  taskUpdate: SyncTaskUpdate;
};

export function readPendingQueue(): PendingSyncQueueItem[] {
  try {
    const raw = localStorage.getItem(PENDING_SYNC_QUEUE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writePendingQueue(queue: PendingSyncQueueItem[]): void {
  localStorage.setItem(PENDING_SYNC_QUEUE_KEY, JSON.stringify(queue));
}

export function enqueueTaskUpdate(update: SyncTaskUpdate): void {
  const queue = readPendingQueue();
  const existing = queue.findIndex((q) => q.taskUpdate.id === update.id);
  const item: PendingSyncQueueItem = {
    id: crypto.randomUUID(),
    queued_at: Date.now(),
    taskUpdate: update,
  };
  if (existing >= 0) {
    queue[existing] = item;
  } else {
    queue.push(item);
  }
  writePendingQueue(queue);
  window.dispatchEvent(new Event('pending-sync-changed'));
}

export function buildSyncPushRequest(queue: PendingSyncQueueItem[]): SyncPushRequest {
  return {
    changes: {
      tasks: {
        created: [],
        updated: queue.map((q) => q.taskUpdate),
        deleted: [],
      },
    },
    last_pulled_at: BigInt(Date.now()),
  };
}

export function clearPendingQueue(): void {
  localStorage.removeItem(PENDING_SYNC_QUEUE_KEY);
  window.dispatchEvent(new Event('pending-sync-changed'));
}

export function isTaskMutationUrl(url: string | undefined, method: string | undefined): boolean {
  if (!url || !method) return false;
  const m = method.toUpperCase();
  if (m !== 'POST' && m !== 'PATCH') return false;
  return url.includes('/tasks');
}
