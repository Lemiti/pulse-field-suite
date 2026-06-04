import { useCallback, useEffect, useState } from 'react';
import { CloudOff, RefreshCw } from 'lucide-react';
import { api } from '../../lib/api';
import {
  buildSyncPushRequest,
  clearPendingQueue,
  readPendingQueue,
} from '../../lib/syncQueue';

export function usePendingSyncCount(): number {
  const [count, setCount] = useState(() => readPendingQueue().length);

  const refresh = useCallback(() => {
    setCount(readPendingQueue().length);
  }, []);

  useEffect(() => {
    window.addEventListener('pending-sync-changed', refresh);
    window.addEventListener('online', refresh);
    return () => {
      window.removeEventListener('pending-sync-changed', refresh);
      window.removeEventListener('online', refresh);
    };
  }, [refresh]);

  return count;
}

async function flushSyncQueue(): Promise<void> {
  const queue = readPendingQueue();
  if (queue.length === 0) return;
  const payload = buildSyncPushRequest(queue);
  await api.post('/sync', {
    ...payload,
    last_pulled_at: Number(payload.last_pulled_at),
  });
  clearPendingQueue();
}

/** Mount once near app root to auto-flush queue when connectivity returns. */
export default function SyncManager() {
  useEffect(() => {
    const onOnline = () => {
      void flushSyncQueue().catch((e) => console.error('Background sync failed', e));
    };
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  return null;
}

export function PendingSyncBanner() {
  const count = usePendingSyncCount();
  const [syncing, setSyncing] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const runSync = useCallback(async () => {
    setSyncing(true);
    try {
      await flushSyncQueue();
    } catch (e) {
      console.error('Sync failed', e);
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (online && count > 0) {
      void runSync();
    }
  }, [online, count, runSync]);

  if (count === 0 && online) return null;

  return (
    <div
      className={`flex items-center gap-3 px-4 py-2 rounded-lg text-xs font-bold ${
        online
          ? 'bg-amber-100 dark:bg-amber-950/50 text-amber-800 dark:text-amber-200 border border-amber-300 dark:border-amber-800'
          : 'bg-red-100 dark:bg-red-950/50 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-800'
      }`}
    >
      {online ? (
        <RefreshCw className={`w-4 h-4 shrink-0 ${syncing ? 'animate-spin' : ''}`} />
      ) : (
        <CloudOff className="w-4 h-4 shrink-0" />
      )}
      <span>
        {online
          ? `${count} change${count === 1 ? '' : 's'} pending sync`
          : `Offline — ${count} task change${count === 1 ? '' : 's'} queued`}
      </span>
      {online && count > 0 && (
        <button
          type="button"
          onClick={() => void runSync()}
          disabled={syncing}
          className="ml-auto px-3 py-1 rounded-md bg-amber-600 hover:bg-amber-700 text-white disabled:opacity-50"
        >
          Sync Now
        </button>
      )}
    </div>
  );
}
