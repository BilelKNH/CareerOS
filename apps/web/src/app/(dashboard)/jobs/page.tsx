'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints, JobOffer } from '@/lib/api-client';
import { scoreBand, categoryColor } from '@/lib/colors';

type Band = 'high' | 'mid' | 'low' | 'none';
const NEW_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
const scoreOf = (j: JobOffer) => j.matches?.[0]?.globalScore ?? null;

function band(score?: number | null): Band {
  if (score == null) return 'none';
  if (score >= 80) return 'high';
  if (score >= 50) return 'mid';
  return 'low';
}
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

function DetailPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['job', id], queryFn: () => endpoints.job(id) });
  const pitch = useMutation({ mutationFn: () => endpoints.adaptCv(id) });
  const [doc, setDoc] = useState<'cv' | 'letter'>('cv');
  const prepare = useMutation({
    mutationFn: () => endpoints.prepareApplication(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['applications'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  if (isLoading || !data) return <section className="card min-h-[200px] w-full p-6 text-sm text-muted">Chargement…</section>;
  const m = data.match;

  return (
    <section className="card relative w-full p-6" style={{ boxShadow: 'var(--shadow-card)' }}>
      <button onClick={onClose} className="absolute right-4 top-4 text-lg text-muted hover:text-foreground" aria-label="Fermer">×</button>
      <div className="flex flex-wrap items-start justify-between gap-4 pr-6">
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

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <button onClick={() => { setDoc('cv'); pitch.mutate(); }} disabled={pitch.isPending} className="btn-secondary text-xs">
                {pitch.isPending && doc === 'cv' ? 'Génération…' : 'Optimiser mon CV'}
              </button>
              <button onClick={() => { setDoc('letter'); if (!pitch.data) pitch.mutate(); }} disabled={pitch.isPending} className="btn-secondary text-xs">
                {pitch.isPending && doc === 'letter' ? 'Génération…' : 'Générer ma lettre'}
              </button>
            </div>
            {pitch.data && (
              <div className="mt-2 rounded-lg p-3 text-xs leading-relaxed text-foreground/80" style={{ background: 'rgb(var(--bg))', boxShadow: 'var(--shadow-card)' }}>
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="agent-badge">agent</span>
                  <span className="text-[10px] text-muted">{doc === 'cv' ? 'accroche CV — à relire' : 'lettre de motivation — à relire'}</span>
                </div>
                <p className="whitespace-pre-line">{doc === 'cv' ? pitch.data.cvSummary : pitch.data.coverLetter}</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted">Pas encore de matching — lance la veille.</p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2.5 pt-3.5" style={{ background: 'linear-gradient(to right, transparent, rgb(var(--border)) 24px, rgb(var(--border)) calc(100% - 24px), transparent) no-repeat top / 100% 1px' }}>
        <button onClick={() => prepare.mutate()} disabled={prepare.isPending || prepare.isSuccess} className="btn-primary">
          {prepare.isSuccess ? '✓ Dossier préparé' : prepare.isPending ? 'Préparation…' : 'Préparer une candidature'}
        </button>
        <a href={data.url} target="_blank" rel="noreferrer" className="btn-secondary">Voir l’offre originale</a>
        {prepare.isSuccess && (
          <a href="/applications" className="btn-ghost text-xs">Voir dans Candidatures</a>
        )}
        <span className="ml-auto text-[11px] text-muted">L’envoi reste toujours votre décision.</span>
      </div>
    </section>
  );
}

function AddOfferModal({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const analyze = useMutation({
    mutationFn: () => (url.trim() ? endpoints.matchOfferUrl(url.trim()) : endpoints.matchOffer({ jobText: text })),
  });
  const r = analyze.data;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: 'color-mix(in srgb, #000 55%, transparent)' }} onClick={onClose}>
      <div className="card w-full max-w-lg p-5" style={{ boxShadow: 'var(--shadow-card)' }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Analyser une offre</h2>
          <button onClick={onClose} className="text-muted hover:text-foreground" aria-label="Fermer">×</button>
        </div>
        <p className="mt-1 text-xs text-muted">Colle l’URL d’une annonce (le serveur va la chercher) ou son texte.</p>

        <label className="mt-3 block text-xs text-muted">URL de l’offre</label>
        <input className="input mt-1 h-9 text-[13px]" placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} />
        <div className="my-2 text-center text-[11px] text-muted">— ou —</div>
        <textarea className="input min-h-[90px] text-[13px]" placeholder="Colle ici le texte de l’offre…" value={text} onChange={(e) => setText(e.target.value)} />

        <div className="mt-3 flex items-center gap-2.5">
          <button onClick={() => analyze.mutate()} disabled={analyze.isPending || (!url.trim() && text.trim().length < 20)} className="btn-primary">
            {analyze.isPending ? 'Analyse…' : 'Analyser'}
          </button>
          {analyze.isError && <span className="text-xs text-bad">{(analyze.error as Error).message}</span>}
        </div>

        {r && (
          <div className="mt-4 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <div className="text-sm font-medium">{r.title}</div>
              <span className={`${scoreBand(r.matchScore).tag} font-medium`}>{r.matchScore} %</span>
            </div>
            <div className="mt-2 text-[11px] text-muted">Compétences couvertes</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {r.matched.length ? r.matched.map((s) => <span key={s} className="chip">{s}</span>) : <span className="text-xs text-muted">—</span>}
            </div>
            <div className="mt-2 text-[11px] text-muted">Manquantes</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {r.missingSkills.length ? r.missingSkills.map((s) => <span key={s} className="tag-outline">{s}</span>) : <span className="text-xs text-muted">Aucune 🎉</span>}
            </div>
            <p className="mt-3 rounded-lg p-2.5 text-xs text-foreground/80" style={{ background: 'color-mix(in srgb, rgb(var(--brand)) 7%, transparent)' }}>
              Probabilité d’entretien <strong className="text-brand">{r.interviewProbability}</strong>. {r.recommendation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function initials(name?: string | null) {
  const p = (name || '?').trim().split(/\s+/);
  return ((p[0]?.[0] ?? '?') + (p[1]?.[0] ?? '')).toUpperCase();
}
function scoreTextCls(s?: number | null) {
  return s == null ? 'text-muted' : s >= 80 ? 'text-ok font-medium' : s >= 50 ? 'text-warn font-medium' : 'text-bad font-medium';
}

function SaveButton({ job }: { job: JobOffer }) {
  const qc = useQueryClient();
  const saved = (job.applications?.length ?? 0) > 0;
  const save = useMutation({
    mutationFn: () => endpoints.prepareApplication(job.id),
    onSuccess: () => {
      ['jobs', 'applications', 'dashboard'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
  });
  return (
    <button
      onClick={() => { if (!saved) save.mutate(); }}
      disabled={saved || save.isPending}
      className="btn-icon"
      aria-label={saved ? 'Déjà dans tes candidatures' : 'Sauvegarder'}
      title={saved ? 'Dans tes candidatures' : 'Sauvegarder dans les candidatures'}
      style={{ color: saved ? 'rgb(var(--brand))' : 'rgb(var(--muted))' }}
    >
      <svg width="16" height="16" viewBox="0 0 256 256" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="16" aria-hidden>
        <path d="M184,32H72A16,16,0,0,0,56,48V224l72-40,72,40V48A16,16,0,0,0,184,32Z" />
      </svg>
    </button>
  );
}

export default function JobsPage() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | Band>('all');
  const [newOnly, setNewOnly] = useState(true);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'match' | 'recent'>('match');
  const [selected, setSelected] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const { data: rawJobs = [], isLoading } = useQuery({ queryKey: ['jobs'], queryFn: endpoints.jobs });
  const { data: prefs } = useQuery({ queryKey: ['preferences'], queryFn: endpoints.preferences });

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
    if (search.trim()) {
      const q = norm(search);
      l = l.filter((j) => norm(`${j.title} ${j.company ?? ''} ${(j.technologies ?? []).join(' ')}`).includes(q));
    }
    return [...l].sort((a, b) =>
      sort === 'match'
        ? (scoreOf(b) ?? -1) - (scoreOf(a) ?? -1)
        : new Date(b.scrapedAt).getTime() - new Date(a.scrapedAt).getTime(),
    );
  }, [deduped, filter, newOnly, search, sort]);

  const profileChips = useMemo(() => {
    const c: string[] = [];
    if (prefs?.desiredRoles?.length) c.push(prefs.desiredRoles.join(', '));
    if (prefs?.locations?.length) c.push(...prefs.locations);
    if (prefs?.contractTypes?.length) c.push(...prefs.contractTypes);
    if (prefs?.remote) c.push(prefs.remote === 'remote' ? 'Télétravail OK' : prefs.remote === 'hybrid' ? 'Hybride' : 'Sur site');
    return c;
  }, [prefs]);

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
            On a sélectionné pour toi les offres les plus alignées avec ton profil.
          </p>
        </div>
        <div className="flex flex-shrink-0 gap-2.5">
          <button onClick={() => setAddOpen(true)} className="btn-secondary">+ Ajouter une offre</button>
          <button onClick={() => recompute.mutate()} disabled={recompute.isPending} className="btn-secondary">
            {recompute.isPending ? '…' : 'Recalculer'}
          </button>
          <button onClick={() => run.mutate()} disabled={run.isPending} className="btn-primary">
            {run.isPending ? 'Veille…' : 'Lancer la veille'}
          </button>
        </div>
      </header>

      {addOpen && <AddOfferModal onClose={() => setAddOpen(false)} />}

      {profileChips.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {profileChips.map((c, i) => <span key={i} className="tag-neutral">{c}</span>)}
        </div>
      )}

      {/* Recherche + tri */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
            <path d="M229.66,218.34l-50.07-50.06a88.11,88.11,0,1,0-11.31,11.31l50.06,50.07a8,8,0,0,0,11.32-11.32ZM40,112a72,72,0,1,1,72,72A72.08,72.08,0,0,1,40,112Z" />
          </svg>
          <input className="input h-9 pl-9 text-[13px]" placeholder="Rechercher un poste, une compétence…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input h-9 w-auto text-[13px]" value={sort} onChange={(e) => setSort(e.target.value as 'match' | 'recent')}>
          <option value="match">Trier : Meilleur match</option>
          <option value="recent">Trier : Plus récentes</option>
        </select>
      </div>

      {/* Filtres bande + nouvelles */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex overflow-hidden rounded-lg border border-border">
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
          {rawJobs.length === 0 ? 'Aucune offre — lance la veille ou ajoute-en une.' : 'Aucune offre dans ce filtre.'}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {list.map((j) => {
            const s = scoreOf(j);
            const accent = categoryColor(j.company || j.title);
            return (
              <div key={j.id} className="card flex flex-col gap-2.5 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xs font-semibold" style={{ background: `${accent}22`, color: accent }}>
                      {initials(j.company)}
                    </span>
                    <span className="truncate text-[13px] text-muted">{j.company ?? '—'}</span>
                  </div>
                  <span className="tag-neutral shrink-0">{j.source}</span>
                </div>

                <button onClick={() => setSelected(j.id)} className="line-clamp-2 text-left text-[15px] font-medium leading-snug hover:text-brand">
                  {j.title}
                </button>

                <div className="flex flex-wrap gap-1.5">
                  <span className="tag-neutral">{ago(j.scrapedAt)}</span>
                  {j.location && <span className="tag-neutral">{j.location}</span>}
                  {j.contractType && <span className="tag-neutral">{j.contractType}</span>}
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between text-[11px]">
                    <span className="text-muted">Compatibilité avec ton profil</span>
                    <span className={scoreTextCls(s)}>{s != null ? `${s}%` : '—'}</span>
                  </div>
                  <div className="h-1.5 rounded-full" style={{ background: 'rgb(var(--border))' }}>
                    <div className="h-1.5 rounded-full" style={{ width: `${s ?? 0}%`, background: scoreBand(s).stroke }} />
                  </div>
                </div>

                {j.description && <p className="line-clamp-2 text-xs text-muted">{j.description}</p>}

                <div className="mt-auto flex items-center gap-2 pt-1">
                  <button onClick={() => setSelected(j.id)} className="btn-primary flex-1">Voir l’offre →</button>
                  <SaveButton job={j} />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: 'color-mix(in srgb, #000 55%, transparent)' }} onClick={() => setSelected(null)}>
          <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <DetailPanel id={selected} onClose={() => setSelected(null)} />
          </div>
        </div>
      )}
    </div>
  );
}
