'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { endpoints } from '@/lib/api-client';

const probColor: Record<string, string> = {
  élevée: 'text-emerald-700',
  moyenne: 'text-amber-700',
  faible: 'text-rose-700',
};

export function OfferMatchCard() {
  const [jobText, setJobText] = useState('');
  const match = useMutation({ mutationFn: (t: string) => endpoints.matchOffer({ jobText: t }) });
  const d = match.data;

  return (
    <section className="card p-6">
      <h2 className="font-medium">Match CV ↔ annonce</h2>
      <p className="text-sm text-muted">
        Colle une annonce d’emploi — on compare ton profil à ses exigences.
      </p>

      <textarea
        className="input mt-3 h-28"
        placeholder="Colle ici le texte de l’offre (missions, compétences requises…)"
        value={jobText}
        onChange={(e) => setJobText(e.target.value)}
      />
      <button
        onClick={() => jobText.trim().length > 20 && match.mutate(jobText)}
        disabled={match.isPending || jobText.trim().length <= 20}
        className="btn-primary mt-3 disabled:opacity-50"
      >
        {match.isPending ? 'Analyse…' : 'Calculer le match'}
      </button>

      {d && (
        <div className="mt-4 space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold">{d.matchScore}</span>
            <span className="text-lg text-muted">/100</span>
            <span className={`text-sm font-medium ${probColor[d.interviewProbability]}`}>
              · entretien {d.interviewProbability}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="mb-1 font-medium text-emerald-700">Tu as</div>
              <div className="flex flex-wrap gap-1">
                {d.matched.length ? (
                  d.matched.map((s) => (
                    <span key={s} className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted">—</span>
                )}
              </div>
            </div>
            <div>
              <div className="mb-1 font-medium text-rose-700">Il manque</div>
              <div className="flex flex-wrap gap-1">
                {d.missingSkills.length ? (
                  d.missingSkills.map((s) => (
                    <span key={s} className="rounded bg-rose-50 px-2 py-0.5 text-xs text-rose-700">
                      {s}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted">Aucune</span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-lg bg-background p-3 text-sm">{d.recommendation}</div>
        </div>
      )}
    </section>
  );
}
