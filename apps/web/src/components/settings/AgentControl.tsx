'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '@/lib/api-client';

export function AgentControl() {
  const qc = useQueryClient();
  const { data: settings } = useQuery({ queryKey: ['agentSettings'], queryFn: endpoints.agentSettingsGet });
  const { data: latest } = useQuery({ queryKey: ['agentDigest'], queryFn: endpoints.agentDigest });

  const toggle = useMutation({
    mutationFn: (enabled: boolean) => endpoints.agentSettings(enabled),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agentSettings'] }),
  });
  const run = useMutation({
    mutationFn: endpoints.agentRun,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agentDigest'] });
      qc.invalidateQueries({ queryKey: ['agentRuns'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });

  const enabled = settings?.autonomousAgentEnabled ?? false;

  return (
    <section className="rounded-xl border bg-surface p-5 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-medium">🤖 Career Agent autonome</h2>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-slate-400'}`} />
              {enabled ? 'Actif' : 'En pause'}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Cycle quotidien à 06:00 : veille → matching → analyse → préparation des candidatures.
          </p>
        </div>
        <button
          onClick={() => run.mutate()}
          disabled={run.isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white disabled:opacity-70"
        >
          {run.isPending && (
            <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
          )}
          {run.isPending ? 'Cycle en cours…' : 'Lancer maintenant'}
        </button>
      </div>

      {run.isPending && (
        <div className="mt-4 flex items-center gap-2 rounded-lg bg-brand-fg p-3 text-sm text-brand">
          <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
          L’agent perçoit, analyse et prépare tes candidatures…
        </div>
      )}

      <label className="mt-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => toggle.mutate(e.target.checked)}
        />
        Exécution automatique quotidienne activée
      </label>

      {latest?.metrics && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3 text-sm text-slate-600">
          Dernier cycle : {latest.metrics.newOffers} nouvelles offres · {latest.metrics.highMatches}{' '}
          match &gt; 85 % · score {latest.metrics.scoreAfter}/100
        </div>
      )}
    </section>
  );
}
