'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis,
  RadarChart, Radar, PolarGrid, PolarAngleAxis,
} from 'recharts';
import { endpoints } from '@/lib/api-client';

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

interface WeeklyPayload {
  newOffers?: number;
  priorityOffers?: { title: string; score: number }[];
  topDemandedSkills?: { name: string; count: number }[];
  recommendedActions?: string[];
}

function Metric({ value, label, delta }: { value: number | string; label: string; delta?: number }) {
  return (
    <div className="card p-4">
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-medium">{value}</span>
        {delta != null && delta !== 0 && (
          <span className="text-[11px] text-brand">{delta > 0 ? '+' : ''}{delta}</span>
        )}
      </div>
      <div className="mt-0.5 text-xs text-muted">{label}</div>
    </div>
  );
}

export default function ReportsPage() {
  const qc = useQueryClient();
  const [type, setType] = useState<'weekly' | 'monthly'>('weekly');

  const { data: reports = [] } = useQuery({ queryKey: ['reports'], queryFn: endpoints.reports });
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: endpoints.profile });
  const { data: overview } = useQuery({ queryKey: ['dashboard'], queryFn: endpoints.dashboard });
  const { data: runs = [] } = useQuery({ queryKey: ['agentRuns'], queryFn: endpoints.agentRuns });
  const { data: skills = [] } = useQuery({ queryKey: ['skills'], queryFn: endpoints.skills });

  const latest = useMemo(() => reports.filter((r) => r.type === type)[0] ?? reports[0], [reports, type]);
  const { data: full } = useQuery({
    queryKey: ['report', latest?.id],
    queryFn: () => endpoints.report(latest!.id),
    enabled: !!latest,
  });
  const payload = (full?.payload ?? {}) as WeeklyPayload;

  const generate = useMutation({
    mutationFn: () => endpoints.generateReport(type),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });

  const done = useMemo(() => runs.filter((r) => r.status === 'completed').slice(0, 8).reverse(), [runs]);
  const trend = done.map((r, i) => ({ x: `S${i + 1}`, v: r.metrics?.scoreAfter ?? 0 }));
  const bars = done.map((r, i) => ({ x: `S${i + 1}`, v: r.metrics?.newOffers ?? 0 }));

  const radar = useMemo(() => {
    const demand = payload.topDemandedSkills ?? [];
    const max = Math.max(1, ...demand.map((d) => d.count));
    const has = new Set(skills.map((s) => norm(s.name)));
    return demand.slice(0, 6).map((d) => ({
      skill: d.name,
      marche: Math.round((d.count / max) * 100),
      profil: has.has(norm(d.name)) ? 90 : 30,
    }));
  }, [payload, skills]);

  const period = latest
    ? `${new Date(latest.periodStart).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })} – ${new Date(latest.periodEnd).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}`
    : null;

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker">Synthèses</div>
          <h1 className="mt-1.5 text-[27px]">Rapports</h1>
          <p className="mt-1.5 max-w-[64ch] text-[13px] text-muted">
            Générés par votre agent — tendances du marché, progression du profil et activité de candidature.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2.5">
          <div className="inline-flex overflow-hidden rounded-lg border border-border text-xs">
            {(['weekly', 'monthly'] as const).map((t, i) => (
              <button key={t} onClick={() => setType(t)}
                className={`px-3 py-1.5 font-medium ${i > 0 ? 'border-l border-border' : ''} ${type === t ? 'text-brand' : 'text-muted hover:text-foreground'}`}
                style={type === t ? { boxShadow: 'inset 0 0 0 1px rgb(var(--brand))' } : undefined}>
                {t === 'weekly' ? 'Hebdo' : 'Mensuel'}
              </button>
            ))}
          </div>
          <button onClick={() => window.print()} className="btn-secondary">Exporter en PDF</button>
        </div>
      </header>

      {!latest ? (
        <div className="card p-8 text-center">
          <p className="text-sm text-muted">Aucun rapport pour le moment.</p>
          <button onClick={() => generate.mutate()} disabled={generate.isPending} className="btn-primary mt-4">
            {generate.isPending ? 'Génération…' : 'Générer un rapport'}
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2.5">
            <span className="text-sm font-medium">{period}</span>
            <span className="text-[11px] text-muted">
              généré le {new Date(latest.generatedAt).toLocaleDateString('fr-FR')}
            </span>
            <button onClick={() => generate.mutate()} disabled={generate.isPending} className="btn-ghost ml-2 text-xs">
              {generate.isPending ? '…' : 'Regénérer'}
            </button>
          </div>

          <div className="grid max-w-[1160px] grid-cols-2 gap-3.5 md:grid-cols-4">
            <Metric value={payload.newOffers ?? 0} label="nouvelles offres analysées" />
            <Metric value={payload.priorityOffers?.length ?? 0} label="forts matchs (≥ 80 %)" />
            <Metric value={overview?.funnel.applied ?? 0} label="candidatures envoyées" />
            <Metric value={profile?.employabilityScore ?? 0} label="score d’employabilité" />
          </div>

          <div className="grid max-w-[1160px] grid-cols-1 gap-3.5 lg:grid-cols-3">
            <section className="card p-4">
              <div className="kicker">Tendance — {trend.length} cycles</div>
              <div className="mt-2 h-[150px]">
                {trend.length > 1 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={trend} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                      <XAxis dataKey="x" tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} />
                      <Line type="monotone" dataKey="v" stroke="rgb(var(--brand))" strokeWidth={2} dot={{ r: 3, fill: 'rgb(var(--brand))' }} />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="pt-8 text-center text-xs text-muted">Pas encore assez de cycles.</p>
                )}
              </div>
            </section>

            <section className="card p-4">
              <div className="kicker">Offres par cycle</div>
              <div className="mt-2 h-[150px]">
                {bars.length ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bars} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
                      <XAxis dataKey="x" tick={{ fontSize: 10, fill: 'rgb(var(--muted))' }} axisLine={false} tickLine={false} />
                      <Bar dataKey="v" fill="rgb(var(--brand))" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="pt-8 text-center text-xs text-muted">Lance un cycle d’agent.</p>
                )}
              </div>
            </section>

            <section className="card p-4">
              <div className="kicker">Profil vs marché</div>
              <div className="mt-2 h-[150px]">
                {radar.length >= 3 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radar} outerRadius={55}>
                      <PolarGrid stroke="rgb(var(--border))" />
                      <PolarAngleAxis dataKey="skill" tick={{ fontSize: 9, fill: 'rgb(var(--muted))' }} />
                      <Radar dataKey="marche" stroke="rgb(var(--muted))" fill="transparent" strokeWidth={1} />
                      <Radar dataKey="profil" stroke="rgb(var(--brand))" fill="rgb(var(--brand))" fillOpacity={0.2} strokeWidth={1.5} />
                    </RadarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="pt-8 text-center text-xs text-muted">Données marché insuffisantes.</p>
                )}
              </div>
              <div className="mt-1 flex gap-3 text-[10px] text-muted">
                <span className="inline-flex items-center gap-1"><span className="h-0.5 w-2 bg-brand" />votre profil</span>
                <span className="inline-flex items-center gap-1"><span className="h-0.5 w-2" style={{ background: 'rgb(var(--muted))' }} />demande marché</span>
              </div>
            </section>
          </div>

          {payload.recommendedActions?.length ? (
            <section className="card max-w-[1160px] p-4">
              <span className="agent-badge">Ce que votre agent retient</span>
              <div className="mt-3 grid grid-cols-1 gap-x-8 gap-y-1.5 text-[13px] leading-relaxed text-foreground/80 md:grid-cols-2">
                {payload.recommendedActions.map((a, i) => (
                  <div key={i}>· {a}</div>
                ))}
              </div>
            </section>
          ) : null}
        </>
      )}
    </div>
  );
}
