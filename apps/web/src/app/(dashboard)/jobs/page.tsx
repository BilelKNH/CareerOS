'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints, JobOffer } from '@/lib/api-client';

type Band = 'high' | 'mid' | 'low' | 'none';

// Règle de lecture : >= 80% => vert, 50-79% => orange, < 50% => rouge.
function band(score?: number): Band {
  if (score == null) return 'none';
  if (score >= 80) return 'high';
  if (score >= 50) return 'mid';
  return 'low';
}

const BAND_META: Record<Band, { badge: string; bar: string; label: string }> = {
  high: { badge: 'bg-emerald-100 text-emerald-700', bar: 'bg-emerald-500', label: 'Fort' },
  mid: { badge: 'bg-amber-100 text-amber-700', bar: 'bg-amber-500', label: 'Moyen' },
  low: { badge: 'bg-rose-100 text-rose-700', bar: 'bg-rose-500', label: 'Faible' },
  none: { badge: 'bg-slate-100 text-slate-500', bar: 'bg-slate-300', label: 'Non évalué' },
};

const probColor: Record<string, string> = {
  élevée: 'text-emerald-700',
  moyenne: 'text-amber-700',
  faible: 'text-rose-700',
};

type Filter = 'all' | Band;

const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const norm = (s?: string | null) =>
  (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

/** Collapse offers that are the same job (title + company), keeping the best-scored one. */
function dedupe(jobs: JobOffer[]): (JobOffer & { duplicates: number })[] {
  const map = new Map<string, JobOffer & { duplicates: number }>();
  for (const j of jobs) {
    const key = `${norm(j.title)}|${norm(j.company)}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, { ...j, duplicates: 1 });
      continue;
    }
    existing.duplicates += 1;
    const better = (j.matches[0]?.globalScore ?? -1) > (existing.matches[0]?.globalScore ?? -1);
    if (better) map.set(key, { ...j, duplicates: existing.duplicates });
  }
  return [...map.values()];
}

export default function JobsPage() {
  const qc = useQueryClient();
  const [sort, setSort] = useState<'match' | 'recent'>('match');
  const [filter, setFilter] = useState<Filter>('all');
  const [newOnly, setNewOnly] = useState(true);
  const { data: rawJobs = [], isLoading } = useQuery({ queryKey: ['jobs'], queryFn: endpoints.jobs });

  const isProcessed = (j: JobOffer) => (j.applications?.length ?? 0) > 0;
  const isNew = (j: JobOffer) =>
    !isProcessed(j) && Date.now() - new Date(j.scrapedAt).getTime() < NEW_WINDOW_MS;

  // Dedupe first, then optionally keep only new (untreated & recent) offers.
  const jobs = useMemo(() => {
    const deduped = dedupe(rawJobs);
    return newOnly ? deduped.filter(isNew) : deduped;
  }, [rawJobs, newOnly]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['jobs'] });
    qc.invalidateQueries({ queryKey: ['matches'] });
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };

  const run = useMutation({ mutationFn: endpoints.runPipeline, onSuccess: invalidate });
  const recompute = useMutation({ mutationFn: endpoints.recomputeMatches, onSuccess: invalidate });

  const scoreOf = (j: JobOffer) => j.matches[0]?.globalScore;

  const counts = useMemo(() => {
    const c = { high: 0, mid: 0, low: 0, none: 0 };
    for (const j of jobs) c[band(scoreOf(j))] += 1;
    return c;
  }, [jobs]);

  const sorted = useMemo(() => {
    let list = [...jobs];
    if (filter !== 'all') list = list.filter((j) => band(scoreOf(j)) === filter);
    if (sort === 'match') list.sort((a, b) => (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1));
    else list.sort((a, b) => new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime());
    return list;
  }, [jobs, sort, filter]);

  const FILTERS: { key: Filter; label: string; n: number }[] = [
    { key: 'all', label: 'Toutes', n: jobs.length },
    { key: 'high', label: 'Fortes ≥ 80%', n: counts.high },
    { key: 'mid', label: 'Moyennes', n: counts.mid },
    { key: 'low', label: 'Faibles', n: counts.low },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Offres</h1>
          <p className="text-sm text-muted">
            Veille quotidienne et scoring de compatibilité. Une offre à <strong>80 % ou plus</strong>{' '}
            est un fort match (en vert).
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => recompute.mutate()}
            disabled={recompute.isPending}
            className="btn-ghost text-sm disabled:opacity-50"
          >
            {recompute.isPending ? '…' : 'Recalculer les scores'}
          </button>
          <button
            onClick={() => run.mutate()}
            disabled={run.isPending}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {run.isPending ? 'Veille en cours…' : 'Lancer la veille'}
          </button>
        </div>
      </header>

      {run.isSuccess && (
        <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">
          {run.data.newOffers} nouvelle(s) offre(s) · {run.data.notifications} alerte(s).
        </div>
      )}

      {/* Récap par niveau */}
      {jobs.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(['high', 'mid', 'low', 'none'] as Band[]).map((b) => (
            <div key={b} className="card flex items-center gap-3 p-3">
              <span className={`h-8 w-1.5 rounded-full ${BAND_META[b].bar}`} />
              <div>
                <div className="text-xl font-semibold">{counts[b]}</div>
                <div className="text-xs text-muted">
                  {b === 'high' ? '≥ 80%' : b === 'mid' ? '50–79%' : b === 'low' ? '< 50%' : 'non évalué'}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filtres + tri */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                filter === f.key ? 'bg-brand text-white' : 'bg-background text-muted hover:text-foreground'
              }`}
            >
              {f.label} ({f.n})
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3 text-sm">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-muted">
            <input
              type="checkbox"
              checked={newOnly}
              onChange={(e) => setNewOnly(e.target.checked)}
              className="h-3.5 w-3.5 accent-[color:var(--brand,#4f46e5)]"
            />
            Nouvelles uniquement
          </label>
          <span className="text-muted">Trier :</span>
          {(['match', 'recent'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSort(s)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                sort === s ? 'bg-brand text-white' : 'bg-background text-muted hover:text-foreground'
              }`}
            >
              {s === 'match' ? 'Meilleur match' : 'Plus récentes'}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-muted">
          {rawJobs.length === 0
            ? 'Aucune offre — lance la veille pour en récupérer.'
            : newOnly
              ? 'Aucune nouvelle offre. Décoche « Nouvelles uniquement » pour revoir tout l’historique.'
              : 'Aucune offre dans ce filtre.'}
        </p>
      ) : (
        <div className="space-y-3">
          {sorted.map((j) => {
            const score = scoreOf(j);
            const b = band(score);
            const meta = BAND_META[b];
            const match = j.matches[0];
            return (
              <Link
                key={j.id}
                href={`/jobs/${j.id}`}
                className="card flex items-stretch gap-4 overflow-hidden p-0 transition hover:border-brand"
              >
                <span className={`w-1.5 shrink-0 ${meta.bar}`} />
                <div className="flex flex-1 items-center justify-between gap-4 py-4 pr-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="truncate font-medium">{j.title}</span>
                      {isNew(j) && (
                        <span className="shrink-0 rounded-full bg-brand-fg px-2 py-0.5 text-[11px] font-medium text-brand">
                          nouveau
                        </span>
                      )}
                      {isProcessed(j) && (
                        <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500">
                          déjà traité
                        </span>
                      )}
                    </div>
                    <div className="truncate text-sm text-muted">
                      {[j.company, j.location, j.contractType, j.source].filter(Boolean).join(' · ')}
                      {j.duplicates > 1 && ` · ${j.duplicates} sources`}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-1">
                      {match?.interviewProbability && (
                        <span
                          className={`mr-2 text-xs font-medium ${probColor[match.interviewProbability] ?? 'text-muted'}`}
                        >
                          entretien {match.interviewProbability}
                        </span>
                      )}
                      {j.technologies.slice(0, 6).map((t) => (
                        <span key={t} className="rounded bg-background px-2 py-0.5 text-xs">
                          {t}
                        </span>
                      ))}
                      {j.technologies.length > 6 && (
                        <span className="text-xs text-muted">+{j.technologies.length - 6}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <span className={`rounded-full px-3 py-1 text-sm font-semibold ${meta.badge}`}>
                      {score != null ? `${score}%` : '—'}
                    </span>
                    <span className="text-[11px] text-muted">{meta.label}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
