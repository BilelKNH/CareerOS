'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Phosphor icon paths (24px viewBox 0 0 256 256, fill=currentColor).
const ICONS: Record<string, string> = {
  agent:
    'M197.58,129.06,146,110l-19-51.62a15.92,15.92,0,0,0-29.88,0L78,110l-51.62,19a15.92,15.92,0,0,0,0,29.88L78,178l19,51.62a15.92,15.92,0,0,0,29.88,0L146,178l51.62-19a15.92,15.92,0,0,0,0-29.88ZM137,164.22a8,8,0,0,0-4.74,4.74L112,223.85,91.78,169A8,8,0,0,0,87,164.22L32.15,144,87,123.78A8,8,0,0,0,91.78,119L112,64.15,132.22,119a8,8,0,0,0,4.74,4.74L191.85,144Z',
  dashboard:
    'M104,40H56A16,16,0,0,0,40,56v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,104,40Zm0,64H56V56h48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V56A16,16,0,0,0,200,40Zm0,64H152V56h48Zm-96,32H56a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,104,136Zm0,64H56V152h48Zm96-64H152a16,16,0,0,0-16,16v48a16,16,0,0,0,16,16h48a16,16,0,0,0,16-16V152A16,16,0,0,0,200,136Zm0,64H152V152h48Z',
  parcours:
    'M230.92,212c-15.23-26.33-38.7-45.21-66.09-54.16a72,72,0,1,0-73.66,0C63.78,166.78,40.31,185.66,25.08,212a8,8,0,1,0,13.85,8c18.84-32.56,52.14-52,89.07-52s70.23,19.44,89.07,52a8,8,0,1,0,13.85-8ZM72,96a56,56,0,1,1,56,56A56.06,56.06,0,0,1,72,96Z',
  cv: 'M213.66,82.34l-56-56A8,8,0,0,0,152,24H56A16,16,0,0,0,40,40V216a16,16,0,0,0,16,16H200a16,16,0,0,0,16-16V88A8,8,0,0,0,213.66,82.34ZM160,51.31,188.69,80H160ZM200,216H56V40h88V88a8,8,0,0,0,8,8h48V216Zm-40.57-64a8,8,0,0,1-2.85,10.94l-24,14a8,8,0,0,1-8.06,0l-24-14A8,8,0,1,1,109.63,149l20,11.67,20-11.67A8,8,0,0,1,159.43,152Z',
  jobs: 'M216,56H176V48a24,24,0,0,0-24-24H104A24,24,0,0,0,80,48v8H40A16,16,0,0,0,24,72V200a16,16,0,0,0,16,16H216a16,16,0,0,0,16-16V72A16,16,0,0,0,216,56ZM96,48a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96ZM216,72v41.61A184,184,0,0,1,128,136a184.07,184.07,0,0,1-88-22.38V72Zm0,128H40V131.64A200.19,200.19,0,0,0,128,152a200.25,200.25,0,0,0,88-20.37V200Z',
  applications:
    'M210.66,26.34a16,16,0,0,0-16.4-3.87h0L21.74,80.28A16,16,0,0,0,19,109.83l73.36,36.68,36.68,73.36a15.88,15.88,0,0,0,14.31,8.84c.44,0,.89,0,1.33-.06a15.89,15.89,0,0,0,14-11.51l57.8-172.51A16,16,0,0,0,210.66,26.34ZM143.36,212.75l-.06.17-35.3-70.61L153.44,96.9a8,8,0,0,0-11.32-11.32L96.69,131l-70.61-35.3.17-.06L216,40Z',
  journal:
    'M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120Z',
  reports:
    'M232,208a8,8,0,0,1-8,8H32a8,8,0,0,1-8-8V48a8,8,0,0,1,16,0v94.37L90.73,98a8,8,0,0,1,10.07-.38l58.81,44.11L218.73,90a8,8,0,1,1,10.54,12l-64,56a8,8,0,0,1-10.07.38L96.39,114.29,40,163.63V200H224A8,8,0,0,1,232,208Z',
  notifications:
    'M221.8,175.94C216.25,166.38,208,139.33,208,104a80,80,0,1,0-160,0c0,35.34-8.26,62.38-13.81,71.94A16,16,0,0,0,48,200H88.81a40,40,0,0,0,78.38,0H208a16,16,0,0,0,13.8-24.06ZM128,216a24,24,0,0,1-22.62-16h45.24A24,24,0,0,1,128,216Z',
  settings:
    'M128,80a48,48,0,1,0,48,48A48.05,48.05,0,0,0,128,80Zm0,80a32,32,0,1,1,32-32A32,32,0,0,1,128,160Zm88-29.84q.06-2.16,0-4.32l14.92-18.64a8,8,0,0,0,1.48-7.06,107.21,107.21,0,0,0-10.88-26.25,8,8,0,0,0-6-3.93l-23.72-2.64q-1.48-1.56-3-3L186,40.54a8,8,0,0,0-3.94-6,107.71,107.71,0,0,0-26.25-10.87,8,8,0,0,0-7.06,1.49L130.16,40Q128,40,125.84,40L107.2,25.11a8,8,0,0,0-7.06-1.48A107.6,107.6,0,0,0,73.89,34.51a8,8,0,0,0-3.93,6L67.32,64.27q-1.56,1.49-3,3L40.54,70a8,8,0,0,0-6,3.94,107.71,107.71,0,0,0-10.87,26.25,8,8,0,0,0,1.49,7.06L40,125.84Q40,128,40,130.16L25.11,148.8a8,8,0,0,0-1.48,7.06,107.21,107.21,0,0,0,10.88,26.25,8,8,0,0,0,6,3.93l23.72,2.64q1.49,1.56,3,3L70,215.46a8,8,0,0,0,3.94,6,107.71,107.71,0,0,0,26.25,10.87,8,8,0,0,0,7.06-1.49L125.84,216q2.16.06,4.32,0l18.64,14.92a8,8,0,0,0,7.06,1.48,107.21,107.21,0,0,0,26.25-10.88,8,8,0,0,0,3.93-6l2.64-23.72q1.56-1.48,3-3L215.46,186a8,8,0,0,0,6-3.94,107.71,107.71,0,0,0,10.87-26.25,8,8,0,0,0-1.49-7.06Z',
};

function Icon({ name }: { name: string }) {
  return (
    <svg width="17" height="17" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
      <path d={ICONS[name] ?? ICONS.dashboard} />
    </svg>
  );
}

const NAV = [
  { href: '/agent', label: 'Career Agent', icon: 'agent' },
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/experiences', label: 'Parcours', icon: 'parcours' },
  { href: '/cv', label: 'Mon CV', icon: 'cv' },
  { href: '/jobs', label: 'Offres', icon: 'jobs' },
  { href: '/applications', label: 'Candidatures', icon: 'applications' },
  { href: '/journal', label: 'Journal', icon: 'journal' },
  { href: '/reports', label: 'Rapports', icon: 'reports' },
  { href: '/notifications', label: 'Notifications', icon: 'notifications' },
  { href: '/settings', label: 'Paramètres', icon: 'settings' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside
      className="flex w-60 shrink-0 flex-col bg-surface px-3.5 py-5"
      style={{
        background:
          'linear-gradient(to bottom, transparent, rgb(var(--border)) 48px, rgb(var(--border)) calc(100% - 48px), transparent) no-repeat right / 1px 100%',
      }}
    >
      <Link
        href="/dashboard"
        className="mb-6 flex items-center gap-2.5 px-2.5 text-foreground"
      >
        <span className="text-brand">
          <svg width="18" height="18" viewBox="0 0 256 256" fill="currentColor" aria-hidden="true">
            <path d="M197.58,129.06,146,110l-19-51.62a15.92,15.92,0,0,0-29.88,0L78,110l-51.62,19a15.92,15.92,0,0,0,0,29.88L78,178l19,51.62a15.92,15.92,0,0,0,29.88,0L146,178l51.62-19a15.92,15.92,0,0,0,0-29.88ZM137,164.22a8,8,0,0,0-4.74,4.74L112,223.85,91.78,169A8,8,0,0,0,87,164.22L32.15,144,87,123.78A8,8,0,0,0,91.78,119L112,64.15,132.22,119a8,8,0,0,0,4.74,4.74L191.85,144Z" />
          </svg>
        </span>
        <span className="text-base font-medium tracking-tight">CareerOS</span>
      </Link>

      <nav className="flex flex-col gap-0.5">
        {NAV.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? 'page' : undefined}
              className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition ${
                active
                  ? 'text-brand'
                  : 'text-muted hover:bg-foreground/[0.06] hover:text-foreground'
              }`}
              style={active ? { background: 'color-mix(in srgb, rgb(var(--brand)) 8%, transparent)' } : undefined}
            >
              {active && (
                <span className="absolute -left-3.5 top-2 bottom-2 w-0.5 rounded-full bg-brand" />
              )}
              <Icon name={item.icon} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="flex-1" />

      <Link
        href="/agent"
        className="block rounded-lg bg-surface p-3 shadow-card transition hover:bg-foreground/[0.03]"
      >
        <div className="flex items-center gap-2 text-[13px] font-medium">
          <span className="h-[7px] w-[7px] animate-pulse rounded-full bg-brand" />
          Agent actif
        </div>
        <div className="mt-1 text-[11px] leading-relaxed text-muted">
          L’agent prépare, vous décidez. Rien ne part sans vous.
        </div>
        <span className="mt-1.5 inline-block text-xs text-brand">Régler l’agent →</span>
      </Link>
    </aside>
  );
}
