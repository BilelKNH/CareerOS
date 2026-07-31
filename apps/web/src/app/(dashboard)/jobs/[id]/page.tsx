'use client';

import { use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { endpoints } from '@/lib/api-client';
import { CvPanel } from '@/components/jobs/CvPanel';

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-28 text-sm text-slate-500">{label}</div>
      <div className="h-2 flex-1 rounded-full bg-slate-100">
        <div className="h-2 rounded-full bg-brand" style={{ width: `${value}%` }} />
      </div>
      <div className="w-10 text-right text-sm font-medium">{value}</div>
    </div>
  );
}

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data, isLoading } = useQuery({ queryKey: ['job', id], queryFn: () => endpoints.job(id) });

  if (isLoading) return <p className="text-sm text-slate-400">Chargement…</p>;
  if (!data) return <p className="text-sm text-slate-400">Offre introuvable.</p>;

  const m = data.match;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{data.title}</h1>
        <p className="text-sm text-slate-500">
          {data.company} · {data.location} · {data.contractType} · {data.source}
        </p>
        <a href={data.url} target="_blank" rel="noreferrer" className="text-sm text-brand underline">
          Voir l’offre
        </a>
      </header>

      {data.description && (
        <section className="rounded-xl border bg-surface p-5 text-sm text-slate-700 shadow-sm">
          {data.description}
        </section>
      )}

      {m ? (
        <section className="rounded-xl border bg-surface p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-medium">Analyse de matching</h2>
            <span
              className={`rounded-full px-3 py-1 text-2xl font-bold ${
                m.globalScore >= 80
                  ? 'bg-emerald-100 text-emerald-700'
                  : m.globalScore >= 50
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-rose-100 text-rose-700'
              }`}
            >
              {m.globalScore}%
            </span>
          </div>

          <div className="space-y-2">
            <Bar label="Technique" value={m.techScore} />
            <Bar label="Expérience" value={m.experienceScore} />
            <Bar label="Localisation" value={m.locationScore} />
            <Bar label="Salaire/TJM" value={m.salaryScore} />
            <Bar label="Séniorité" value={m.seniorityScore} />
            <Bar label="Contrat" value={m.contractScore} />
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="mb-1 font-medium text-emerald-700">Points forts</div>
              <div className="flex flex-wrap gap-1">
                {m.strengths.map((s) => (
                  <span key={s} className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                    {s}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <div className="mb-1 font-medium text-rose-700">Compétences manquantes</div>
              <div className="flex flex-wrap gap-1">
                {m.missingSkills.length === 0 ? (
                  <span className="text-xs text-slate-400">Aucune</span>
                ) : (
                  m.missingSkills.map((s) => (
                    <span key={s} className="rounded bg-rose-50 px-2 py-0.5 text-xs text-rose-700">
                      {s}
                    </span>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-sm">
            <div>
              Probabilité d’entretien : <strong>{m.interviewProbability}</strong>
              {m.readinessDays != null && ` · prêt en ~${m.readinessDays} j`}
            </div>
            {m.recommendations && <div className="mt-1 text-slate-600">{m.recommendations}</div>}
          </div>
        </section>
      ) : (
        <p className="text-sm text-slate-400">
          Pas encore de matching — lance la veille depuis la page Offres.
        </p>
      )}

      <CvPanel offerId={id} />
    </div>
  );
}
