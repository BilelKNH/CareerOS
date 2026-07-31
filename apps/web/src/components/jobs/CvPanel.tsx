'use client';

import { useMutation } from '@tanstack/react-query';
import { endpoints } from '@/lib/api-client';

export function CvPanel({ offerId }: { offerId: string }) {
  const adapt = useMutation({ mutationFn: () => endpoints.adaptCv(offerId) });

  return (
    <section className="rounded-xl border bg-surface p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-medium">Adapter mes supports (Agent CV)</h2>
        <button
          onClick={() => adapt.mutate()}
          disabled={adapt.isPending}
          className="rounded-lg bg-brand px-3 py-1.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {adapt.isPending ? 'Génération…' : 'Générer'}
        </button>
      </div>

      {adapt.data && (
        <div className="space-y-3 text-sm">
          <Block title="Accroche CV">{adapt.data.cvSummary}</Block>
          <Block title="Titre LinkedIn">{adapt.data.linkedinHeadline}</Block>
          <Block title="Pitch Malt">{adapt.data.maltPitch}</Block>
          <Block title="Lettre de motivation">{adapt.data.coverLetter}</Block>
          <div>
            <div className="mb-1 font-medium text-slate-600">Mots-clés ATS</div>
            <div className="flex flex-wrap gap-1">
              {adapt.data.atsKeywords.map((k) => (
                <span key={k} className="rounded bg-brand-fg px-2 py-0.5 text-xs text-brand">
                  {k}
                </span>
              ))}
            </div>
          </div>
          <p className="text-xs text-slate-400">
            Généré par {adapt.data.method === 'llm' ? 'IA' : 'modèle'} — relis et ajuste avant envoi.
          </p>
        </div>
      )}
    </section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-1 font-medium text-slate-600">{title}</div>
      <p className="whitespace-pre-line rounded-lg bg-slate-50 p-3 text-slate-700">{children}</p>
    </div>
  );
}
