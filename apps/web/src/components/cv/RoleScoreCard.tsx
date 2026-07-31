'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { endpoints } from '@/lib/api-client';

export function RoleScoreCard() {
  const [role, setRole] = useState('QA Automation Engineer');
  const score = useMutation({ mutationFn: (r: string) => endpoints.matchRole(r) });
  const d = score.data;

  return (
    <section className="card p-6">
      <h2 className="font-medium">Score par poste (marché)</h2>
      <p className="text-sm text-muted">
        Note ton profil face à la demande réelle du marché pour un poste donné.
      </p>

      <div className="mt-3 flex gap-2">
        <input
          className="input flex-1"
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Ex. SDET, Cloud QA…"
        />
        <button
          onClick={() => role.trim() && score.mutate(role)}
          disabled={score.isPending}
          className="btn-primary disabled:opacity-50"
        >
          {score.isPending ? '…' : 'Évaluer'}
        </button>
      </div>

      {d && (
        <div className="mt-4 space-y-3">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-semibold">{d.roleScore}</span>
            <span className="text-lg text-muted">/100</span>
            <span className="text-sm text-muted">
              · {d.coverage}% des compétences demandées · {d.offerCount} offre(s)
            </span>
          </div>
          {!d.matchedOnRole && (
            <p className="text-xs text-amber-600">
              Peu/pas d’offres pour ce poste en base — score calculé sur l’ensemble des offres.
            </p>
          )}

          <div>
            <div className="mb-1 text-sm font-medium">Compétences demandées</div>
            <div className="flex flex-wrap gap-2">
              {d.demanded.map((s) => (
                <span
                  key={s.name}
                  className={`rounded-full px-3 py-1 text-sm ${
                    s.have ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {s.have ? '✓ ' : ''}
                  {s.name}
                </span>
              ))}
            </div>
          </div>

          {(d.marketSalary || d.marketTjm) && (
            <div className="text-sm text-muted">
              {d.marketSalary && `Salaire marché : ${d.marketSalary.min}–${d.marketSalary.max}k. `}
              {d.marketTjm && `TJM : ${d.marketTjm.min}–${d.marketTjm.max}€.`}
            </div>
          )}

          {d.recommendations.length > 0 && (
            <ul className="text-sm text-muted">
              {d.recommendations.map((r, i) => (
                <li key={i}>• {r}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
