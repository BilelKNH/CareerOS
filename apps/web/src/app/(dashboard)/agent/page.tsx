'use client';

import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints, AgentAction } from '@/lib/api-client';

function ActionRow({ a }: { a: AgentAction }) {
  return (
    <div className="flex items-start justify-between rounded-lg border p-3">
      <div>
        <div className="text-sm font-medium">{a.label}</div>
        {a.detail && <div className="text-xs text-slate-500">{a.detail}</div>}
      </div>
      {a.done ? (
        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">fait ✓</span>
      ) : a.requiresConfirmation ? (
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
          à valider
        </span>
      ) : (
        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">suggéré</span>
      )}
    </div>
  );
}

export default function AgentPage() {
  const qc = useQueryClient();
  const { data: latest } = useQuery({ queryKey: ['agentDigest'], queryFn: endpoints.agentDigest });
  const { data: runs = [] } = useQuery({ queryKey: ['agentRuns'], queryFn: endpoints.agentRuns });

  const run = useMutation({
    mutationFn: endpoints.agentRun,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agentDigest'] });
      qc.invalidateQueries({ queryKey: ['agentRuns'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const digest = latest?.digest;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">🤖 Career Agent</h1>
          <p className="text-sm text-slate-500">
            Ton directeur de carrière autonome — perçoit, analyse et agit chaque jour.
          </p>
        </div>
        <button
          onClick={() => run.mutate()}
          disabled={run.isPending}
          className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
        >
          {run.isPending ? 'Cycle en cours…' : 'Lancer un cycle maintenant'}
        </button>
      </header>

      {digest ? (
        <>
          <section className="rounded-xl border bg-surface p-5 shadow-sm">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="font-medium">Briefing</h2>
              <span className="text-xs text-slate-400">
                {digest.method === 'llm' ? 'planifié par IA' : 'planifié par règles'}
              </span>
            </div>
            <p className="text-sm text-slate-700">{digest.narrative}</p>
            <div className="mt-3 flex gap-4 text-sm">
              <span>
                Score : <strong>{digest.employabilityScore}/100</strong>
                {digest.scoreDelta !== 0 && (
                  <span className={digest.scoreDelta > 0 ? 'text-emerald-600' : 'text-rose-600'}>
                    {' '}
                    ({digest.scoreDelta > 0 ? '+' : ''}
                    {digest.scoreDelta})
                  </span>
                )}
              </span>
              <span>
                Couverture marché : <strong>{digest.marketHighlights.skillCoverage}%</strong>
              </span>
              {digest.applications && (
                <span>
                  Candidatures : <strong>{digest.applications.submitted}</strong> envoyées ·{' '}
                  <strong>{digest.applications.pendingReview}</strong> à valider
                </span>
              )}
            </div>
          </section>

          <section className="rounded-xl border bg-surface p-5 shadow-sm">
            <h2 className="mb-3 font-medium">Actions</h2>
            <div className="space-y-2">
              {digest.recommendedActions.map((a, i) => (
                <ActionRow key={i} a={a} />
              ))}
            </div>
          </section>

          {digest.cvDrafts.length > 0 && (
            <section className="rounded-xl border bg-surface p-5 shadow-sm">
              <h2 className="mb-3 font-medium">CV pré-générés</h2>
              <div className="space-y-2">
                {digest.cvDrafts.map((d) => (
                  <Link
                    key={d.offerId}
                    href={`/jobs/${d.offerId}`}
                    className="block rounded-lg border p-3 hover:border-brand"
                  >
                    <div className="text-sm font-medium">{d.title}</div>
                    <div className="text-xs text-slate-500">{d.cvSummary}</div>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-400">
          Aucun cycle encore. Clique sur « Lancer un cycle maintenant » pour démarrer l’agent.
        </p>
      )}

      <section className="rounded-xl border bg-surface p-5 shadow-sm">
        <h2 className="mb-3 font-medium">Historique des cycles</h2>
        {runs.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun cycle.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {runs.map((r) => (
              <li key={r.id} className="flex justify-between border-b py-1 last:border-0">
                <span>
                  {new Date(r.startedAt).toLocaleString('fr-FR')} · {r.trigger}
                </span>
                <span className="text-slate-500">
                  {r.status === 'completed'
                    ? `${r.metrics?.newOffers ?? 0} offres · score ${r.metrics?.scoreAfter ?? '—'}`
                    : r.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
