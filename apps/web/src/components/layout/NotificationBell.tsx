'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/lib/api-client';

export function NotificationBell() {
  const { data: count = 0 } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: endpoints.unreadCount,
    refetchInterval: 30000,
  });

  return (
    <Link
      href="/notifications"
      className="relative inline-flex items-center rounded-lg border border-border p-2 text-muted transition hover:text-foreground"
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
        <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
        <path d="M13.7 21a2 2 0 0 1-3.4 0" />
      </svg>
      {count > 0 && (
        <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-rose-500 px-1 text-xs font-medium text-white">
          {count}
        </span>
      )}
    </Link>
  );
}
