'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/lib/api-client';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { LogoutButton } from '@/components/layout/LogoutButton';

function initials(name?: string | null, email?: string) {
  const src = (name || email || 'B').trim();
  const parts = src.split(/[\s@.]+/).filter(Boolean);
  return (parts[0]?.[0] ?? 'B').toUpperCase();
}

export function TopBar() {
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: endpoints.profile });
  const { data: unread = 0 } = useQuery({
    queryKey: ['unreadCount'],
    queryFn: endpoints.unreadCount,
    refetchInterval: 30000,
  });

  return (
    <header
      className="sticky top-0 z-10 flex items-center gap-3 bg-background/80 px-7 py-2.5 backdrop-blur"
      style={{
        background:
          'linear-gradient(to right, transparent, rgb(var(--border)) 48px, rgb(var(--border)) calc(100% - 48px), transparent) no-repeat bottom / 100% 1px',
      }}
    >
      <div className="relative w-[300px] max-w-[40vw]">
        <svg
          width="14"
          height="14"
          viewBox="0 0 256 256"
          fill="currentColor"
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted"
        >
          <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" />
        </svg>
        <input
          className="input h-8 pl-8 text-[13px]"
          placeholder="Rechercher une offre, une compétence…"
          aria-label="Rechercher"
        />
      </div>

      <div className="flex-1" />

      <ThemeToggle />

      <Link
        href="/notifications"
        aria-label="Notifications"
        className="btn-icon relative"
      >
        <svg width="15" height="15" viewBox="0 0 256 256" fill="currentColor" aria-hidden>
          <path d="M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216Z" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[15px] min-w-[15px] items-center justify-center rounded-full px-1 text-[10px] font-medium agent-badge before:hidden">
            {unread}
          </span>
        )}
      </Link>

      <Link
        href="/settings"
        aria-label="Profil"
        className="grid h-8 w-8 place-items-center rounded-full text-xs font-medium"
        style={{ background: 'rgb(var(--brand-fg))', color: 'rgb(var(--brand))' }}
      >
        {initials(profile?.fullName, profile?.email)}
      </Link>

      <LogoutButton />
    </header>
  );
}
