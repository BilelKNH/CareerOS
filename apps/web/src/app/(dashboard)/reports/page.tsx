'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints } from '@/lib/api-client';

export default function ReportsPage() {
  const qc = useQueryClient();
  const [openId, setOpenId] = useState<string | null>(null);

  const { data: reports = [] } = useQuery({ queryKey: ['reports'], queryFn: endpoints.reports });
  const { data: full } = useQuery({
    queryKey: ['report', openId],
    queryFn: () => endpoints.report(openId as string),
    enabled: !!openId,
  });

  const generate = useMutation({
    mutationFn: (type: 'weekly' | 'monthly') => endpoints.generateReport(type),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reports'] }),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Rapports</h1>
          <p className="text-sm text-slate-500">Synthèses hebdomadaires et mensuelles.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => generate.mutate('weekly')}
            className="rounded-lg border border-brand px-3 py-2 text-sm font-medium text-brand"
          >
            Générer hebdo
          </button>
          <button
            onClick={() => generate.mutate('monthly')}
            className="rounded-lg bg-brand px-3 py-2 text-sm font-medium text-white"
          >
            Générer mensuel
          </button>
        </div>
      </header>

      {reports.length === 0 ? (
        <p className="text-sm text-slate-400">Aucun rapport — génères-en un.</p>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => (
            <div key={r.id} className="rounded-xl border bg-surface p-4 shadow-sm">
              <button
                onClick={() => setOpenId(openId === r.id ? null : r.id)}
                className="flex w-full items-center justify-between"
              >
                <span className="font-medium capitalize">
                  Rapport {r.type === 'weekly' ? 'hebdomadaire' : 'mensuel'}
                </span>
                <span className="text-sm text-slate-400">
                  {new Date(r.generatedAt).toLocaleDateString('fr-FR')}
                </span>
              </button>
              {openId === r.id && full && (
                <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs">
                  {JSON.stringify(full.payload, null, 2)}
                </pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
