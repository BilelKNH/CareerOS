'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints, JobOffer } from '@/lib/api-client';
import { scoreBand } from '@/lib/colors';

type Band = 'high' | 'mid' | 'low' | 'none';
const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const scoreOf = (j: JobOffer) => j.matches?.[0]?.globalScore ?? null;

function band(score?: number | null): Band {
  if (score == null) return 'none';
  if (score >= 80) return 'high';
  if (score >= 50) return 'mid';
  return 'low';
}
const scoreTag = (score?: number | null) => scoreBand(score).tag;
const norm = (s?: string | null) =>
  (s ?? '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();

function ago(iso?: string) {
  if (!iso) return '';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3.6e6);
  if (h < 1) return "à l'instant";
  if (h < 24) return `il y a ${h} h`;
  const d = Math.floor(h / 24);
  return d === 1 ? 'hier' : `il y a ${d} j`;
}
const PROB: Record<string, string> = { elevee: 'élevée', moyenne: 'moyenne', faible: 'faible' };

function dedupe(jobs: JobOffer[]): JobOffer[] {
  const map = new Map<string, JobOffer>();
  for (const j of jobs) {
    const key = `${norm(j.title)}|${norm(j.company)}`;
    const cur = map.get(key);
    if (!cur || (scoreOf(j) ?? -1) > (scoreOf(cur) ?? -1)) map.set(key, j);
  }
  return [...map.values()];
}

function MiniGauge({ value }: { value: number }) {
  const r = 35;
  const c = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, value)) / 100;
  const stroke = scoreBand(value).stroke;
  return (
    <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden>
      <circle cx="42" cy="42" r={r} fill="none" stroke="rgb(var(--border))" strokeWidth="6" />
      <circle cx="42" cy="42" r={r} fill="none" stroke={stroke} strokeWidth="6" strokeLinecap="round"
        strokeDasharray={`${(filled * c).toFixed(1)} ${c.toFixed(1)}`} transform="rotate(-90 42 42)" />
      <text x="42" y="41" textAnchor="middle" style={{ fill: 'rgb(var(--fg))', fontSize: 19, fontWeight: 500 }}>{value}</text>
      <text x="42" y="55" textAnchor="middle" style={{ fill: 'rgb(var(--muted))', fontSize: 9 }}>match</text>
    </svg>
  );
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <span className="w-[88px] text-xs text-muted">{label}</span>
      <div className="h-1 flex-1 rounded-full" style={{ background: 'rgb(var(--border))' }}>
        <div className="h-1 rounded-full" style={{ width: `${value}%`, background: 'rgb(var(--brand))' }} />
      </div>
      <span className="w-7 text-right text-xs font-medium">{value}</span>
    </div>
  );
}

function DetailPanel({ id }: { id: string }) {
  const { data, isLoading } = useQuery({ queryKey: ['job', id], queryFn: () => endpoints.job(id) });
  const pitch = useMutation({ mutationFn: () => endpoints.adaptCv(id) });

  if (isLoading || !data) return <section className="card min-h-[300px] flex-1 p-6 text-sm text-muted">Chargement…</section>;
  const m = data.match;

  return (
    <section className="card flex-1 self-start p-6 lg:sticky lg:top-4" style={{ minWidth: 0, boxShadow: 'var(--shadow-card)' }}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="agent-badge">agent</span>
            <span className="text-[11px] text-muted">{data.source} · {ago(data.scrapedAt)}</span>
          </div>
          <h2 className="mt-2 text-[21px]">{data.title}</h2>
          <div className="mt-0.5 text-[13px] text-muted">
            {[data.company, data.location, data.contractType, data.salary].filter(Boolean).join(' · ')}
          </div>
        </div>
        {m && <MiniGauge value={m.globalScore} />}
      </div>

      {m ? (
        <div className="mt-4 grid grid-cols-1 gap-6 md:grid-cols-[1.1fr_1fr]">
          <div>
            <h6 className="mb-2.5 text-muted">Détail du matching</h6>
            <div className="flex flex-col gap-1.5">
              <Bar label="Technique" value={m.techScore} />
              <Bar label="Expérience" value={m.experienceScore} />
              <Bar label="Localisation" value={m.locationScore} />
              <Bar label="Salaire / TJM" value={m.salaryScore} />
              <Bar label="Séniorité" value={m.seniorityScore} />
              <Bar label="Contrat" value={m.contractScore} />
            </div>
            <div className="mt-3.5 rounded-lg p-3 text-xs leading-relaxed text-foreground/80"
              style={{ background: 'color-mix(in srgb, rgb(var(--brand)) 7%, transparent)' }}>
              Probabilité d’entretien <strong className="font-medium text-brand">{PROB[m.interviewProbability]}</strong>
              {m.readinessDays != null && ` · prêt en ~${m.readinessDays} j`}.
              {m.recommendations && <><br />{m.recommendations}</>}
            </div>
          </div>

          <div>
            <h6 className="mb-2.5 text-muted">Compétences</h6>
            <div className="mb-1.5 text-[11px] text-muted">Couvertes</div>
            <div className="flex flex-wrap gap-1.5">
              {m.strengths.length ? m.strengths.map((s) => <span key={s} className="chip">{s}</span>) : <span className="text-xs text-muted">—</span>}
            </div>
            <div className="mb-1.5 mt-2.5 text-[11px] text-muted">Manquantes</div>
            <div className="flex flex-wrap gap-1.5">
              {m.missingSkills.length ? m.missingSkills.map((s) => <span key={s} className="tag-outline">{s}</span>) : <span className="text-xs text-muted">Aucune 🎉</span>}
            </div>

            <div className="mt-4 flex items-center justify-between">
              <h6 className="text-muted">CV adapté (aperçu)</h6>
              <button onClick={() => pitch.mutate()} disabled={pitch.isPending} className="btn-ghost text-xs">
                {pitch.isPending ? 'Génération…' : pitch.data ? 'Régénérer' : 'Générer'}
              </button>
            </div>
            <div className="mt-1 rounded-lg p-3 text-xs leading-relaxed text-foreground/80" style={{ background: 'rgb(var(--bg))', boxShadow: 'var(--shadow-card)' }}>
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="agent-badge">agent</span>
                <span className="text-[10px] text-muted">accroche générée — à relire</span>
              </div>
              {pitch.data?.cvSummary ?? 'Clique sur « Générer » pour une accroche adaptée à cette offre.'}
            </div>
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">Pas encore de matching — lance la veille.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2.5 pt-3.5" style={{ background: 'linear-gradient(to right, transparent, rgb(var(--border)) 24px, rgb(var(--border)) calc(100% - 24px), transparent) no-repeat top / 100% 1px' }}>
        <a href={data.url} target="_blank" rel="noreferrer" className="btn-primary">Voir l’offre originale</a>
        <span className="ml-auto text-[11px] text-muted">L’envoi reste toujours votre décision.</span>
      </div>
    </section>
  );
}

export default function JobsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | Band>('all');
  const [newOnly, setNewOnly] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const { data: rawJobs = [], isLoading } = useQuery({ queryKey: ['jobs'], queryFn: endpoints.jobs });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['jobs'] });
    qc.invalidateQueries({ queryKey: ['notifications'] });
  };
  const run = useMutation({ mutationFn: endpoints.runPipeline, onSuccess: invalidate });
  const recompute = useMutation({ mutationFn: endpoints.recomputeMatches, onSuccess: invalidate });

  const isProcessed = (j: JobOffer) => (j.applications?.length ?? 0) > 0;
  const isNew = (j: JobOffer) => !isProcessed(j) && Date.now() - new Date(j.scrapedAt).getTime() < NEW_WINDOW_MS;

  const deduped = useMemo(() => dedupe(rawJobs), [rawJobs]);
  const counts = useMemo(() => {
    const c = { all: deduped.length, high: 0, mid: 0, low: 0 };
    for (const j of deduped) { const b = band(scoreOf(j)); if (b !== 'none') (c as Record<string, number>)[b] += 1; }
    return c;
  }, [deduped]);

  const list = useMemo(() => {
    let l = newOnly ? deduped.filter(isNew) : deduped;
    if (filter !== 'all') l = l.filter((j) => band(scoreOf(j)) === filter);
    return l.sort((a, b) => (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1));
  }, [deduped, filter, newOnly]);

  useEffect(() => {
    if (!list.length) { setSelected(null); return; }
    if (!selected || !list.some((j) => j.id === selected)) setSelected(list[0].id);
  }, [list, selected]);

  const high = counts.high;

  const FILTERS: { key: 'all' | Band; label: string; n: number }[] = [
    { key: 'all', label: 'Toutes', n: counts.all },
    { key: 'high', label: '≥ 80 %', n: counts.high },
    { key: 'mid', label: '50–79 %', n: counts.mid },
    { key: 'low', label: '< 50 %', n: counts.low },
  ];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker">Marché</div>
          <h1 className="mt-1.5 text-[27px]">Offres</h1>
          <p className="mt-1.5 max-w-[64ch] text-[13px] text-muted">
            Veille multi-sources. {deduped.length} offres analysées — {high} au-dessus de 80 %.
          </p>
        </div>
        <div className="flex flex-shrink-0 gap-2.5">
          <button onClick={() => recompute.mutate()} disabled={recompute.isPending} className="btn-secondary">
            {recompute.isPending ? '…' : 'Recalculer les scores'}
          </button>
          <button onClick={() => run.mutate()} disabled={run.isPending} className="btn-primary">
            {run.isPending ? 'Veille…' : 'Lancer la veille'}
          </button>
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <div className="seg inline-flex overflow-hidden rounded-lg border border-border">
          {FILTERS.map((f, i) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 text-xs font-medium transition ${i > 0 ? 'border-l border-border' : ''} ${
                filter === f.key ? 'text-brand' : 'text-muted hover:text-foreground'
              }`}
              style={filter === f.key ? { boxShadow: 'inset 0 0 0 1px rgb(var(--brand))' } : undefined}
            >
              {f.label} · {f.n}
            </button>
          ))}
        </div>
        <label className="ml-auto flex cursor-pointer items-center gap-2 text-xs text-muted">
          <input type="checkbox" checked={newOnly} onChange={(e) => setNewOnly(e.target.checked)} className="h-3.5 w-3.5 accent-[color:rgb(var(--brand))]" />
          Nouvelles uniquement
        </label>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted">
          {rawJobs.length === 0 ? 'Aucune offre — lance la veille.' : 'Aucune offre dans ce filtre.'}
        </p>
      ) : (
        <div className="flex flex-wrap items-start gap-5">
          <div className="flex w-full flex-col gap-2 lg:w-[380px] lg:flex-shrink-0">
            {list.map((j) => {
              const s = scoreOf(j);
              const active = selected === j.id;
              return (
                <button
                  key={j.id}
                  onClick={() => setSelected(j.id)}
                  className="relative rounded-lg bg-surface p-3 pl-4 text-left transition"
                  style={{ boxShadow: active ? 'var(--shadow-card)' : '0 0 0 1px rgb(var(--border))' }}
                >
                  {active && <span className="absolute left-0 top-2.5 bottom-2.5 w-0.5 rounded-full bg-brand" />}
                  <div className="flex items-center justify-between gap-2.5">
                    <span className="min-w-0 truncate text-sm font-medium">{j.title}</span>
                    <span className={`${scoreTag(s)} font-medium`}>{s != null ? `${s} %` : '—'}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">
                    {[j.company, j.location, j.contractType].filter(Boolean).join(' · ')} · {ago(j.scrapedAt)}
                  </div>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {(j.technologies ?? []).slice(0, 3).map((t) => <span key={t} className="tag-neutral">{t}</span>)}
                    {isProcessed(j) && <span className="tag-neutral">déjà traité</span>}
                  </div>
                </button>
              );
            })}
          </div>

          {selected && <DetailPanel id={selected} />}
        </div>
      )}
    </div>
  );
}
