'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints, Application } from '@/lib/api-client';
import { scoreBand } from '@/lib/colors';

type Filter = 'all' | 'review' | 'sent' | 'rejected';

const CHANNEL: Record<string, string> = { email: 'email', manual: 'manuel', external_url: 'lien externe' };

function statusTag(s: Application['status']): { label: string; cls: string } {
  switch (s) {
    case 'pending_review':
    case 'approved':
      return { label: 'à valider', cls: 'tag-ok' };
    case 'submitted':
      return { label: 'envoyée', cls: 'tag-neutral' };
    case 'rejected':
      return { label: 'refusée', cls: 'tag-bad' };
    case 'failed':
      return { label: 'échec', cls: 'tag-bad' };
    case 'skipped':
      return { label: 'ignorée', cls: 'tag-neutral' };
    default:
      return { label: 'brouillon', cls: 'tag-neutral' };
  }
}

const fdate = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }) : '';

function Preview({ kicker, text, expanded }: { kicker: string; text: string; expanded: boolean }) {
  return (
    <div className="rounded-lg p-3" style={{ background: 'rgb(var(--bg))', boxShadow: 'var(--shadow-card)' }}>
      <div className="kicker mb-1.5">{kicker}</div>
      <p className={`m-0 text-xs leading-relaxed text-foreground/75 ${expanded ? '' : 'line-clamp-3'}`}>{text}</p>
    </div>
  );
}

function AppCard({ app }: { app: Application }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['applications'] });
    qc.invalidateQueries({ queryKey: ['dashboard'] });
  };
  const approve = useMutation({ mutationFn: () => endpoints.approveApplication(app.id), onSuccess: invalidate });
  const skip = useMutation({ mutationFn: () => endpoints.skipApplication(app.id), onSuccess: invalidate });
  const followUp = useMutation({ mutationFn: () => endpoints.followUpApplication(app.id), onSuccess: invalidate });

  const st = statusTag(app.status);
  const toReview = app.status === 'pending_review' || app.status === 'approved';
  const sent = app.status === 'submitted';
  const rejected = app.status === 'rejected';
  const band = scoreBand(app.matchScore);
  const matchCls = band.tag === 'tag-ok' ? 'text-ok' : band.tag === 'tag-warn' ? 'text-warn' : band.tag === 'tag-bad' ? 'text-bad' : '';
  const hasDocs = !!(app.cvSummary || app.coverLetter);

  return (
    <section className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-[15px] font-medium">{app.jobOffer?.title ?? 'Dossier'}</span>
            <span className="agent-badge">agent</span>
          </div>
          <div className="mt-0.5 text-xs text-muted">
            {app.jobOffer?.company ?? '—'} · matching <span className={matchCls}>{app.matchScore ?? '—'} %</span> · canal{' '}
            {CHANNEL[app.channel] ?? app.channel}
            {sent ? ` · envoyée le ${fdate(app.submittedAt)}` : ` · préparée le ${fdate(app.createdAt)}`}
          </div>
        </div>
        <span className={`${st.cls} flex-shrink-0`}>{st.label}</span>
      </div>

      {toReview && hasDocs && (
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {app.cvSummary && <Preview kicker="Accroche CV" text={app.cvSummary} expanded={open} />}
          {app.coverLetter && <Preview kicker="Lettre de motivation" text={app.coverLetter} expanded={open} />}
        </div>
      )}

      {rejected && open && app.notes && (
        <div className="mt-3 rounded-lg p-3 text-xs leading-relaxed text-foreground/75" style={{ background: 'rgb(var(--bg))' }}>
          {app.notes}
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2.5">
        {toReview && (
          <>
            <button onClick={() => approve.mutate()} disabled={approve.isPending} className="btn-primary">
              {approve.isPending ? '…' : 'Approuver & envoyer'}
            </button>
            <button onClick={() => setOpen((o) => !o)} className="btn-secondary">
              {open ? 'Réduire' : hasDocs ? 'Modifier le dossier' : 'Voir le dossier'}
            </button>
            <button onClick={() => skip.mutate()} className="btn-ghost" style={{ color: 'rgb(var(--muted))' }}>Ignorer</button>
            <span className="ml-auto text-[11px] text-muted">l’envoi part sous votre nom, après votre clic</span>
          </>
        )}
        {sent && (
          <>
            <button onClick={() => followUp.mutate()} disabled={followUp.isPending} className="btn-secondary">
              {followUp.isPending ? '…' : 'Relancer'}
            </button>
            {hasDocs && (
              <button onClick={() => setOpen((o) => !o)} className="btn-ghost">{open ? 'Réduire' : 'Voir le dossier'}</button>
            )}
            {app.submittedAt && <span className="ml-auto text-[11px] text-muted">envoyée le {fdate(app.submittedAt)}</span>}
          </>
        )}
        {rejected && (
          <>
            {app.notes && (
              <button onClick={() => setOpen((o) => !o)} className="btn-ghost">{open ? 'Masquer' : 'Voir le retour'}</button>
            )}
            <button onClick={() => skip.mutate()} className="btn-ghost" style={{ color: 'rgb(var(--muted))' }}>Archiver</button>
          </>
        )}
      </div>
    </section>
  );
}

function Metric({ value, label, sub }: { value: number; label: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-2xl font-medium">{value}</div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted/70">{sub}</div>}
    </div>
  );
}

export default function ApplicationsPage() {
  const [filter, setFilter] = useState<Filter>('all');
  const { data: apps = [], isLoading } = useQuery({ queryKey: ['applications'], queryFn: endpoints.applications });

  const counts = useMemo(() => {
    const c = { all: apps.length, review: 0, sent: 0, rejected: 0, byEmail: 0 };
    for (const a of apps) {
      if (a.status === 'pending_review' || a.status === 'approved') c.review += 1;
      if (a.status === 'submitted') { c.sent += 1; if (a.channel === 'email') c.byEmail += 1; }
      if (a.status === 'rejected') c.rejected += 1;
    }
    return c;
  }, [apps]);

  const list = useMemo(() => {
    if (filter === 'review') return apps.filter((a) => a.status === 'pending_review' || a.status === 'approved');
    if (filter === 'sent') return apps.filter((a) => a.status === 'submitted');
    if (filter === 'rejected') return apps.filter((a) => a.status === 'rejected');
    return apps;
  }, [apps, filter]);

  const FILTERS: { key: Filter; label: string; n: number }[] = [
    { key: 'all', label: 'Toutes', n: counts.all },
    { key: 'review', label: 'À valider', n: counts.review },
    { key: 'sent', label: 'Envoyées', n: counts.sent },
    { key: 'rejected', label: 'Refusées', n: counts.rejected },
  ];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker">Pipeline</div>
          <h1 className="mt-1.5 text-[27px]">Candidatures</h1>
          <p className="mt-1.5 max-w-[64ch] text-[13px] text-muted">
            Dossiers préparés par votre agent — relisez, approuvez ou ignorez. Rien n’est envoyé sans vous.
          </p>
        </div>
        <div className="inline-flex flex-shrink-0 overflow-hidden rounded-lg border border-border text-xs">
          {FILTERS.map((f, i) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 font-medium ${i > 0 ? 'border-l border-border' : ''} ${filter === f.key ? 'text-brand' : 'text-muted hover:text-foreground'}`}
              style={filter === f.key ? { boxShadow: 'inset 0 0 0 1px rgb(var(--brand))' } : undefined}>
              {f.label} · {f.n}
            </button>
          ))}
        </div>
      </header>

      <div className="grid max-w-[1100px] grid-cols-2 gap-3.5 md:grid-cols-4">
        <Metric value={counts.review} label="à valider" sub="préparées par l’agent" />
        <Metric value={counts.sent} label="envoyées" sub={counts.byEmail ? `dont ${counts.byEmail} par email` : undefined} />
        <Metric value={counts.rejected} label="refusées" />
        <Metric value={counts.all} label="dossiers au total" />
      </div>

      {isLoading ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted">
          {apps.length === 0 ? 'Aucune candidature — lance un cycle du Career Agent pour en préparer.' : 'Aucun dossier dans ce filtre.'}
        </p>
      ) : (
        <div className="flex max-w-[1100px] flex-col gap-3">
          {list.map((a) => <AppCard key={a.id} app={a} />)}
        </div>
      )}
    </div>
  );
}
