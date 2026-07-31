'use client';

import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/lib/api-client';

const LABELS: Record<string, string> = {
  francetravail: 'France Travail (API officielle)',
  adzuna: 'Adzuna (agrégateur)',
  sample: 'Échantillon (offline)',
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  wttj: 'Welcome to the Jungle',
  apec: 'APEC',
  freework: 'FreeWork',
  hellowork: 'HelloWork',
  malt: 'Malt',
  chooseyourboss: 'ChooseYourBoss',
};

export function SourcesPanel() {
  const { data: sources = [] } = useQuery({ queryKey: ['sources'], queryFn: endpoints.sources });

  return (
    <section className="rounded-xl border bg-surface p-5 shadow-sm">
      <h2 className="font-medium">Sources d’offres</h2>
      <p className="mb-3 text-sm text-slate-500">
        France Travail s’active en renseignant ses identifiants API dans le <code>.env</code>.
      </p>
      <ul className="space-y-1 text-sm">
        {sources.map((s) => (
          <li key={s.source} className="flex items-center justify-between border-b py-1 last:border-0">
            <span>{LABELS[s.source] ?? s.source}</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs ${
                s.enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              {s.enabled ? 'active' : 'inactive'}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
