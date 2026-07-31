'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints, TrackedApplication } from '@/lib/api-client';

const STATUS_LABEL: Record<string, string> = {
  draft: 'Brouillon',
  pending_review: 'À valider',
  approved: 'Prête',
  submitted: 'Postulée',
  rejected: 'Refus',
  skipped: 'Ignorée',
  failed: 'Échec',
};
const STATUS_STYLE: Record<string, string> = {
  pending_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-sky-100 text-sky-800',
  submitted: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-rose-100 text-rose-700',
  skipped: 'bg-slate-100 text-slate-500',
  failed: 'bg-rose-100 text-rose-700',
  draft: 'bg-slate-100 text-slate-500',
};

function FunnelCard({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 text-3xl font-semibold ${tone ?? ''}`}>{value}</div>
    </div>
  );
}

export default function DashboardPage() {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery({ queryKey: ['dashboard'], queryFn: endpoints.dashboard });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['dashboard'] });
  const followUp = useMutation({ mutationFn: (id: string) => endpoints.followUpApplication(id), onSuccess: invalidate });
  const reject = useMutation({ mutationFn: (id: string) => endpoints.rejectApplication(id), onSuccess: invalidate });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Suivi de recherche</h1>
        <p className="text-sm text-muted">Tes offres et candidatures, du repérage au résultat.</p>
      </header>

      {error && (
        <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          Connecte-toi d’abord — {String((error as Error).message)}
        </div>
      )}

      {isLoading ? (
        <p className="text-sm text-muted">Chargement…</p>
      ) : data ? (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <Link href="/jobs" className="contents">
              <FunnelCard label="Offres intéressantes" value={data.funnel.interesting} />
            </Link>
            <Link href="/applications" className="contents">
              <FunnelCard label="À postuler" value={data.funnel.toApply} tone="text-amber-600" />
            </Link>
            <FunnelCard label="Postulées" value={data.funnel.applied} tone="text-emerald-600" />
            <FunnelCard label="À relancer" value={data.funnel.toFollowUp} tone="text-sky-600" />
            <FunnelCard label="Refus" value={data.funnel.rejected} tone="text-rose-600" />
          </section>

          <section className="card p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-medium">Mes candidatures</h2>
              <Link href="/applications" className="text-sm text-brand hover:underline">
                Gérer
              </Link>
            </div>

            {data.applications.length === 0 ? (
              <p className="text-sm text-muted">
                Aucune candidature. Lance la veille puis prépare tes dossiers depuis les offres.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left text-muted">
                    <tr>
                      <th className="py-2">Offre</th>
                      <th className="py-2">Match</th>
                      <th className="py-2">Statut</th>
                      <th className="py-2">Postulée</th>
                      <th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.applications.map((a: TrackedApplication) => (
                      <tr key={a.id} className="border-t border-border">
                        <td className="py-2">
                          <a href={a.url} target="_blank" rel="noreferrer" className="hover:text-brand">
                            {a.title}
                          </a>
                          <span className="text-muted"> · {a.company}</span>
                          {a.needsFollowUp && (
                            <span className="ml-2 rounded-full bg-sky-100 px-2 py-0.5 text-xs text-sky-700">
                              à relancer
                            </span>
                          )}
                        </td>
                        <td className="py-2">{a.matchScore != null ? `${a.matchScore}%` : '—'}</td>
                        <td className="py-2">
                          <span className={`rounded-full px-2 py-0.5 text-xs ${STATUS_STYLE[a.status]}`}>
                            {STATUS_LABEL[a.status]}
                          </span>
                        </td>
                        <td className="py-2 text-muted">
                          {a.submittedAt ? new Date(a.submittedAt).toLocaleDateString('fr-FR') : '—'}
                        </td>
                        <td className="py-2 text-right">
                          {a.status === 'submitted' && (
                            <div className="flex justify-end gap-2 text-xs">
                              {a.needsFollowUp && (
                                <button onClick={() => followUp.mutate(a.id)} className="text-sky-700 hover:underline">
                                  Relancé
                                </button>
                              )}
                              <button onClick={() => reject.mutate(a.id)} className="text-rose-600 hover:underline">
                                Refus
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="grid grid-cols-2 gap-3">
            <div className="card p-4">
              <div className="text-xs text-muted">Score d’employabilité</div>
              <div className="mt-1 text-3xl font-semibold">
                {data.employabilityScore}
                <span className="text-lg text-muted">/100</span>
              </div>
            </div>
            <div className="card p-4">
              <div className="text-xs text-muted">Score CV</div>
              <div className="mt-1 text-3xl font-semibold">
                {data.cvScore ?? '—'}
                {data.cvScore != null && <span className="text-lg text-muted">/100</span>}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
