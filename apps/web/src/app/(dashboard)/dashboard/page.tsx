'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { endpoints, JobOffer } from '@/lib/api-client';
import { scoreBand } from '@/lib/colors';

const scoreOf = (j: JobOffer) => j.matches?.[0]?.globalScore ?? null;

function Gauge({ value }: { value: number }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const filled = Math.max(0, Math.min(100, value)) / 100;
  return (
    <svg width="104" height="104" viewBox="0 0 104 104" aria-hidden>
      <circle cx="52" cy="52" r={r} fill="none" stroke="rgb(var(--border))" strokeWidth="7" />
      <circle
        cx="52"
        cy="52"
        r={r}
        fill="none"
        stroke={scoreBand(value).stroke}
        strokeWidth="7"
        strokeLinecap="round"
        strokeDasharray={`${(filled * c).toFixed(1)} ${c.toFixed(1)}`}
        transform="rotate(-90 52 52)"
      />
      <text x="52" y="50" textAnchor="middle" style={{ fill: 'rgb(var(--fg))', fontSize: 25, fontWeight: 500 }}>
        {value}
      </text>
      <text x="52" y="66" textAnchor="middle" style={{ fill: 'rgb(var(--muted))', fontSize: 10 }}>
        /100
      </text>
    </svg>
  );
}

export default function DashboardPage() {
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: endpoints.profile });
  const { data: overview } = useQuery({ queryKey: ['dashboard'], queryFn: endpoints.dashboard });
  const { data: jobs = [] } = useQuery({ queryKey: ['jobs'], queryFn: endpoints.jobs });
  const { data: careers = [] } = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers });
  const { data: runs = [] } = useQuery({ queryKey: ['agentRuns'], queryFn: endpoints.agentRuns });
  const { data: applications = [] } = useQuery({ queryKey: ['applications'], queryFn: endpoints.applications });
  const { data: journalEntries = [] } = useQuery({ queryKey: ['journal'], queryFn: endpoints.journal });

  const firstName = (profile?.fullName || '').split(' ')[0] || 'à toi';
  const dateStr = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const employability = profile?.employabilityScore ?? overview?.employabilityScore ?? 0;

  const topAlertes = useMemo(
    () =>
      [...jobs]
        .filter((j) => scoreOf(j) != null)
        .sort((a, b) => (scoreOf(b) ?? 0) - (scoreOf(a) ?? 0))
        .slice(0, 3),
    [jobs],
  );
  const highMatches = jobs.filter((j) => (scoreOf(j) ?? 0) >= 80).length;

  const insights = useMemo(() => {
    const total = jobs.length;
    const remote = jobs.filter((j) =>
      /remote|télétravail|teletravail|hybride/i.test(`${j.location ?? ''} ${j.title} ${j.contractType ?? ''}`),
    ).length;
    const techCount = new Map<string, number>();
    for (const j of jobs) for (const t of j.technologies ?? []) techCount.set(t, (techCount.get(t) ?? 0) + 1);
    const topTech = [...techCount.entries()].sort((a, b) => b[1] - a[1])[0];
    return { total, remotePct: total ? Math.round((remote / total) * 100) : 0, topTech };
  }, [jobs]);

  const gaps = useMemo(() => {
    const count = new Map<string, number>();
    for (const c of careers) for (const m of c.missing ?? []) count.set(m, (count.get(m) ?? 0) + 1);
    const list = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const max = list[0]?.[1] ?? 1;
    return list.map(([name, n]) => ({ name, n, pct: Math.round((n / max) * 100) }));
  }, [careers]);

  const toValidate = overview?.funnel.toApply ?? 0;
  const nearMiss = useMemo(
    () => jobs.find((j) => { const s = scoreOf(j); return s != null && s >= 60 && s < 80; }),
    [jobs],
  );

  const actions = useMemo(() => {
    const list: { text: string; tag: 'à valider' | 'suggéré'; href: string; cta: string }[] = [];
    if (toValidate > 0)
      list.push({ text: `Valider ${toValidate} dossier(s) préparé(s) par l’agent`, tag: 'à valider', href: '/applications', cta: 'Ouvrir' });
    if (nearMiss)
      list.push({ text: `Se positionner sur « ${nearMiss.title} » — quelques compétences manquantes`, tag: 'suggéré', href: '/jobs', cta: 'Voir' });
    if (gaps[0])
      list.push({ text: `Monter en compétence sur ${gaps[0].name} (${gaps[0].n} métiers cibles)`, tag: 'suggéré', href: '/experiences', cta: 'Planifier' });
    if (!list.length)
      list.push({ text: 'Importer ou mettre à jour ton CV pour affiner le matching', tag: 'suggéré', href: '/cv', cta: 'Importer' });
    return list;
  }, [toValidate, nearMiss, gaps]);

  const activity = useMemo(() => {
    const items: { time: string; text: string }[] = [];
    for (const r of runs.filter((x) => x.status === 'completed').slice(0, 3)) {
      const t = r.finishedAt
        ? new Date(r.finishedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
        : '—';
      items.push({
        time: t,
        text: r.metrics ? `${r.metrics.newOffers} offres analysées · ${r.metrics.highMatches} forts matchs` : 'Cycle de veille exécuté',
      });
    }
    return items;
  }, [runs]);

  // Gamification — streak of active days (journal + candidatures) and weekly goal.
  const dayKey = (d: Date) => d.toISOString().slice(0, 10);
  const streak = useMemo(() => {
    const days = new Set<string>();
    const add = (iso?: string | null) => { if (iso) days.add(dayKey(new Date(iso))); };
    applications.forEach((a) => { add(a.createdAt); add(a.submittedAt); });
    journalEntries.forEach((j) => add(j.createdAt));
    let n = 0;
    const d = new Date();
    if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1); // grace: today optional
    while (days.has(dayKey(d))) { n += 1; d.setDate(d.getDate() - 1); }
    return n;
  }, [applications, journalEntries]);

  const WEEK_GOAL = 5;
  const weeklyDone = useMemo(() => {
    const now = new Date();
    const monday = new Date(now);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(now.getDate() - ((now.getDay() + 6) % 7));
    return applications.filter((a) => a.status === 'submitted' && a.submittedAt && new Date(a.submittedAt) >= monday).length;
  }, [applications]);

  const kanban = useMemo(() => {
    const appsList = overview?.applications ?? [];
    type A = (typeof appsList)[number];
    const cols: { save: A[]; applied: A[]; interview: A[]; offer: A[]; rejected: A[] } = {
      save: [], applied: [], interview: [], offer: [], rejected: [],
    };
    for (const a of appsList) {
      if (a.status === 'pending_review' || a.status === 'approved') cols.save.push(a);
      else if (a.status === 'submitted') cols.applied.push(a);
      else if (a.status === 'interview') cols.interview.push(a);
      else if (a.status === 'offer') cols.offer.push(a);
      else if (a.status === 'rejected') cols.rejected.push(a);
    }
    return cols;
  }, [overview]);

  const interviews = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return (overview?.applications ?? [])
      .filter((a) => a.interviewAt && new Date(a.interviewAt) >= start)
      .sort((a, b) => new Date(a.interviewAt!).getTime() - new Date(b.interviewAt!).getTime());
  }, [overview]);

  return (
    <div className="flex items-start gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-5">
        <header className="flex items-end justify-between gap-4">
          <div>
            <div className="kicker capitalize">{dateStr}</div>
            <h1 className="mt-1.5 text-[27px]">Bonjour {firstName}</h1>
          </div>
          <Link href="/jobs" className="btn-primary">
            Explorer les offres
            <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden>
              <path d="M221.66,133.66l-72,72a8,8,0,0,1-11.32-11.32L196.69,136H40a8,8,0,0,1,0-16H196.69L138.34,61.66a8,8,0,0,1,11.32-11.32l72,72A8,8,0,0,1,221.66,133.66Z" />
            </svg>
          </Link>
        </header>

        <section
          className="card glow-accent p-5"
          style={{ background: 'linear-gradient(135deg, color-mix(in srgb, rgb(var(--brand-fg)) 70%, rgb(var(--surface))), rgb(var(--surface)) 60%)' }}
        >
          <div className="flex items-center gap-2">
            <span className="agent-badge">Briefing de votre agent</span>
            <span className="text-[11px] text-muted">cycle nocturne · planifié</span>
          </div>
          <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed text-foreground/85">
            Votre agent a analysé <strong className="font-medium text-foreground">{jobs.length} offres</strong>, dont{' '}
            <strong className="font-medium text-foreground">{highMatches} forts matchs</strong> (≥ 80 %).{' '}
            {toValidate > 0
              ? `${toValidate} dossier(s) de candidature attendent votre validation — rien ne part sans vous.`
              : 'Aucun dossier en attente pour le moment.'}
          </p>
          <div className="mt-3.5 flex flex-wrap items-center gap-2.5">
            {toValidate > 0 && (
              <Link href="/applications" className="btn-primary">
                Valider {toValidate} dossier(s)
              </Link>
            )}
            <Link href="/jobs" className="btn-secondary">
              Voir les offres
            </Link>
            <span className="ml-1.5 text-xs text-muted">
              Score {employability}/100 · {highMatches} forts matchs
            </span>
          </div>
        </section>

        {/* Gamification */}
        <div className="grid grid-cols-2 gap-3.5">
          <section className="card p-4">
            <div className="kicker">Série d’activité</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-3xl font-medium text-brand">{streak}</span>
              <span className="text-sm text-muted">jour{streak > 1 ? 's' : ''} d’affilée</span>
            </div>
            <div className="mt-1 text-xs text-muted">Note un fait au Journal ou avance une candidature chaque jour pour garder la série.</div>
          </section>
          <section className="card p-4">
            <div className="kicker">Objectif de la semaine</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-3xl font-medium">{weeklyDone}</span>
              <span className="text-sm text-muted">/ {WEEK_GOAL} candidatures envoyées</span>
            </div>
            <div className="mt-2 h-1.5 rounded-full" style={{ background: 'rgb(var(--border))' }}>
              <div
                className="h-1.5 rounded-full"
                style={{ width: `${Math.min((weeklyDone / WEEK_GOAL) * 100, 100)}%`, background: weeklyDone >= WEEK_GOAL ? 'rgb(var(--ok))' : 'rgb(var(--brand))' }}
              />
            </div>
          </section>
        </div>

        {/* Kanban candidatures */}
        <section>
          <div className="mb-2 flex items-center justify-between">
            <div className="kicker">Suivi des candidatures</div>
            <Link href="/applications" className="btn-ghost text-xs">Tout voir</Link>
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
            {([
              { key: 'save', label: 'À valider', items: kanban.save },
              { key: 'applied', label: 'Postulées', items: kanban.applied },
              { key: 'interview', label: 'Entretien', items: kanban.interview },
              { key: 'offer', label: 'Proposition', items: kanban.offer },
              { key: 'rejected', label: 'Refusées', items: kanban.rejected },
            ] as const).map((col) => (
              <div key={col.key} className="card p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-medium">{col.label}</span>
                  <span className="tag-neutral">{col.items.length}</span>
                </div>
                <div className="flex flex-col gap-2">
                  {col.items.length === 0 && <div className="py-2 text-xs text-muted">—</div>}
                  {col.items.map((a) => (
                    <Link key={a.id} href="/applications" className="rounded-lg p-2.5" style={{ background: 'rgb(var(--bg))', boxShadow: 'var(--shadow-card)' }}>
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate text-[13px] font-medium">{a.title}</span>
                        {a.matchScore != null && <span className={`${scoreBand(a.matchScore).tag} text-[10px]`}>{a.matchScore}%</span>}
                      </div>
                      <div className="truncate text-[11px] text-muted">
                        {a.company ?? '—'}{a.needsFollowUp ? ' · à relancer' : ''}
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        {interviews.length > 0 && (
          <section className="card p-4">
            <div className="kicker">Prochains entretiens</div>
            <div className="mt-1 flex flex-col">
              {interviews.map((a) => (
                <Link key={a.id} href="/applications" className="flex items-center justify-between gap-3 border-b border-border/50 py-2 last:border-0">
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-medium">{a.title}</span>
                    <span className="block text-[11px] text-muted">{a.company}</span>
                  </span>
                  <span className="chip whitespace-nowrap">
                    {new Date(a.interviewAt!).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    {' · '}
                    {new Date(a.interviewAt!).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          <section className="card p-4">
            <div className="kicker">Employabilité</div>
            <div className="mt-1 flex items-center gap-4">
              <Gauge value={employability} />
              <div className="text-xs leading-relaxed text-muted">
                <div className="text-brand">objectif 80</div>
                <div className="mt-1">
                  {gaps.length
                    ? `Combler ${Math.min(2, gaps.length)} compétence(s) clé(s).`
                    : 'Profil solide, continue les candidatures.'}
                </div>
              </div>
            </div>
          </section>

          <section className="card p-4">
            <div className="kicker">Top alertes</div>
            <div className="mt-1 flex flex-col">
              {topAlertes.length === 0 && (
                <div className="py-2 text-[13px] text-muted">Lance une veille pour voir les offres.</div>
              )}
              {topAlertes.map((j, i) => {
                const s = scoreOf(j) ?? 0;
                return (
                  <Link
                    key={j.id}
                    href={`/jobs/${j.id}`}
                    className={`flex items-center gap-2.5 py-2 ${i < topAlertes.length - 1 ? 'border-b border-border/60' : ''}`}
                  >
                    <span className={`${scoreBand(s).tag} font-medium`}>{s}%</span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px]">{j.title}</span>
                      <span className="block text-[11px] text-muted">{[j.company, j.location].filter(Boolean).join(' · ')}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="card p-4">
            <div className="kicker">Insights marché</div>
            <div className="mt-1 flex flex-col gap-2.5 text-[13px] text-foreground/80">
              <div className="flex items-baseline gap-2">
                <span className="whitespace-nowrap font-medium text-brand">{insights.total}</span>
                offres analysées sur ta zone
              </div>
              {insights.topTech && (
                <div className="flex items-baseline gap-2">
                  <span className="whitespace-nowrap font-medium text-brand">{insights.topTech[1]}×</span>
                  {insights.topTech[0]} — compétence la plus demandée
                </div>
              )}
              <div className="flex items-baseline gap-2">
                <span className="whitespace-nowrap font-medium text-brand">{insights.remotePct}%</span>
                des offres proposent du remote / hybride
              </div>
            </div>
          </section>

          <section className="card p-4">
            <div className="kicker">Compétences à développer</div>
            <div className="mt-1 flex flex-col gap-2.5">
              {gaps.length === 0 && <div className="text-[13px] text-muted">Aucun écart majeur détecté.</div>}
              {gaps.map((g) => (
                <div key={g.name}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{g.name}</span>
                    <span className="text-muted">{g.n} métiers</span>
                  </div>
                  <div className="h-1 rounded-full" style={{ background: 'rgb(var(--border))' }}>
                    <div className="h-1 rounded-full" style={{ width: `${g.pct}%`, background: 'rgb(var(--brand))' }} />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-4 sm:col-span-2">
            <div className="kicker">Prochaines actions</div>
            <div className="mt-1 flex flex-col">
              {actions.map((a, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-2.5 py-2 ${i < actions.length - 1 ? 'border-b border-border/60' : ''}`}
                >
                  <span className="flex-1 text-[13px]">{a.text}</span>
                  <span className={a.tag === 'à valider' ? 'chip' : 'tag-neutral'}>{a.tag}</span>
                  <Link href={a.href} className="btn-ghost text-xs">
                    {a.cta}
                  </Link>
                </div>
              ))}
            </div>
          </section>

          <section className="card p-4">
            <div className="kicker">Activité de l’agent</div>
            <div className="mt-1 flex flex-col">
              {activity.length === 0 && (
                <div className="text-[13px] text-muted">Aucun cycle récent — lance-en un depuis Career Agent.</div>
              )}
              {activity.map((it, i) => (
                <div key={i} className="flex gap-2.5">
                  <div className="flex flex-col items-center">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full" style={{ background: i === 0 ? 'rgb(var(--brand))' : 'rgb(var(--muted))' }} />
                    {i < activity.length - 1 && <span className="w-px flex-1" style={{ background: 'rgb(var(--border))' }} />}
                  </div>
                  <div className="pb-2.5">
                    <div className="text-xs text-muted">{it.time}</div>
                    <div className="text-[13px]">{it.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>

      <aside className="hidden w-[300px] shrink-0 flex-col gap-3.5 xl:flex">
        <section
          className="card glow-accent p-4"
          style={{ background: 'linear-gradient(160deg, color-mix(in srgb, rgb(var(--brand-fg)) 75%, rgb(var(--surface))), rgb(var(--surface)) 70%)' }}
        >
          <span className="agent-badge self-start">Votre agent</span>
          <p className="mt-2 text-[13px] leading-relaxed text-foreground/85">
            {highMatches} forts matchs repérés{toValidate > 0 ? `, ${toValidate} dossier(s) prêt(s)` : ''}. Rien ne part
            sans votre validation.
          </p>
          <Link href={toValidate > 0 ? '/applications' : '/jobs'} className="btn-primary mt-2 self-start">
            {toValidate > 0 ? 'Valider les dossiers' : 'Voir les offres'}
          </Link>
        </section>

        <section className="card p-4">
          <div className="kicker">File de l’agent</div>
          <div className="mt-1 flex flex-col gap-2 text-[13px] text-foreground/80">
            <div className="flex items-center justify-between gap-2">
              <span>Dossiers à valider</span>
              <span className={toValidate > 0 ? 'chip' : 'tag-neutral'}>{toValidate > 0 ? 'à valider' : 'aucun'}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Veille des offres</span>
              <span className="tag-neutral">{runs.some((r) => r.status === 'completed') ? 'fait' : 'en attente'}</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span>Rapport hebdo</span>
              <Link href="/reports" className="tag-neutral">voir</Link>
            </div>
          </div>
        </section>
      </aside>
    </div>
  );
}
