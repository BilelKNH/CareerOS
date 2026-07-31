'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '@/lib/api-client';

export default function NotificationsPage() {
  const qc = useQueryClient();
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['notifications'],
    queryFn: endpoints.notifications,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['notifications'] });
    qc.invalidateQueries({ queryKey: ['unreadCount'] });
  };

  const markRead = useMutation({
    mutationFn: (id: string) => endpoints.markNotificationRead(id),
    onSuccess: invalidate,
  });

  const markAll = useMutation({
    mutationFn: endpoints.markAllNotificationsRead,
    onSuccess: invalidate,
  });

  const hasUnread = items.some((n) => !n.read);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-slate-500">Alertes matching ≥ 80 %, marché et rapports.</p>
        </div>
        {hasUnread && (
          <button
            onClick={() => markAll.mutate()}
            disabled={markAll.isPending}
            className="btn-ghost text-sm disabled:opacity-50"
          >
            {markAll.isPending ? '…' : 'Tout marquer comme lu'}
          </button>
        )}
      </header>

      {isLoading ? (
        <p className="text-sm text-slate-400">Chargement…</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-400">Aucune notification.</p>
      ) : (
        <div className="space-y-2">
          {items.map((n) => (
            <div
              key={n.id}
              className={`rounded-xl border p-4 shadow-sm ${n.read ? 'bg-surface' : 'bg-brand-fg'}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-medium">{n.title}</div>
                {!n.read && (
                  <button
                    onClick={() => markRead.mutate(n.id)}
                    className="text-xs text-brand hover:underline"
                  >
                    Marquer comme lu
                  </button>
                )}
              </div>
              {n.body && <div className="mt-1 text-sm text-slate-600">{n.body}</div>}
              <div className="mt-1 text-xs text-slate-400">
                {new Date(n.createdAt).toLocaleString('fr-FR')}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
