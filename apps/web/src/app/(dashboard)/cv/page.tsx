'use client';

import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints, CvImportResult } from '@/lib/api-client';
import { CareerExplorer } from '@/components/cv/CareerExplorer';
import { OfferMatchCard } from '@/components/cv/OfferMatchCard';

export default function CvPage() {
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<CvImportResult | null>(null);

  const upload = useMutation({
    mutationFn: (f: File) => endpoints.importCv(f),
    onSuccess: (data) => {
      setResult(data);
      qc.invalidateQueries({ queryKey: ['skills'] });
      qc.invalidateQueries({ queryKey: ['experiences'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['careers'] });
    },
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Mon CV</h1>
        <p className="text-sm text-muted">
          Importe ton CV (PDF ou DOCX). L’Agent Mémoire en extrait tes compétences, met à jour ton
          profil et recalcule ton score d’employabilité.
        </p>
      </header>

      <section className="card p-6">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />

        <div
          onClick={() => inputRef.current?.click()}
          className="cursor-pointer rounded-xl border border-dashed border-border p-8 text-center transition hover:border-brand"
        >
          <div className="text-sm font-medium">{file ? file.name : 'Choisir un fichier'}</div>
          <div className="mt-1 text-xs text-muted">PDF ou DOCX · 5 Mo max</div>
        </div>

        <button
          onClick={() => file && upload.mutate(file)}
          disabled={!file || upload.isPending}
          className="btn-primary mt-4 disabled:opacity-50"
        >
          {upload.isPending ? 'Analyse en cours…' : 'Analyser mon CV'}
        </button>

        {upload.isError && (
          <p className="mt-3 text-sm text-rose-600">
            {(upload.error as Error)?.message ?? 'Import échoué'}
          </p>
        )}
      </section>

      {result && (
        <section className="card p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-medium">Résultat</h2>
            <span className="text-xs text-muted">
              extraction {result.extraction.method === 'llm' ? 'IA' : 'heuristique'}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-background p-4">
              <div className="text-xs text-muted">Score du CV</div>
              <div className="text-3xl font-semibold">
                {result.cvScore.global}
                <span className="text-lg text-muted">/100</span>
              </div>
            </div>
            <div className="rounded-xl bg-background p-4">
              <div className="text-xs text-muted">Score d’employabilité</div>
              <div className="text-3xl font-semibold">
                {result.employabilityScore}
                <span className="text-lg text-muted">/100</span>
              </div>
            </div>
          </div>

          <div className="mt-5 space-y-2">
            <div className="text-sm font-medium">Notation par critère</div>
            {result.cvScore.criteria.map((c) => (
              <div key={c.key} className="flex items-center gap-3">
                <div className="w-44 text-sm text-muted">{c.label}</div>
                <div className="h-2 flex-1 rounded-full bg-background">
                  <div
                    className={`h-2 rounded-full ${
                      c.score >= 75 ? 'bg-emerald-500' : c.score >= 55 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${c.score}%` }}
                  />
                </div>
                <div className="w-9 text-right text-sm font-medium">{c.score}</div>
              </div>
            ))}
          </div>

          {result.cvScore.recommendations.length > 0 && (
            <div className="mt-5">
              <div className="text-sm font-medium">Recommandations</div>
              <ul className="mt-2 space-y-1 text-sm text-muted">
                {result.cvScore.recommendations.map((r, i) => (
                  <li key={i}>• {r}</li>
                ))}
              </ul>
            </div>
          )}

          {result.extraction.summary && (
            <p className="mt-4 text-sm text-muted">{result.extraction.summary}</p>
          )}

          <div className="mt-4 text-sm font-medium">
            {result.addedSkills.length} compétence(s) ajoutées · {result.experiencesAdded}{' '}
            expérience(s) ajoutées ({result.experiencesFound} détectée(s) dans le CV)
          </div>
          {result.experiencesError && (
            <p className="mt-1 text-xs text-rose-600">
              L’import des expériences a échoué : {result.experiencesError}
            </p>
          )}
          {!result.experiencesError && result.experiencesFound === 0 && (
            <p className="mt-1 text-xs text-muted">
              Aucune expérience détectée dans le document (format ou mise en page non reconnus). Tu
              peux les ajouter à la main dans la page Parcours.
            </p>
          )}

          {result.experiencesDetail.length > 0 && (
            <div className="mt-3 space-y-1.5">
              <div className="text-xs font-medium text-muted">Expériences détectées</div>
              {result.experiencesDetail.map((e, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg bg-background px-3 py-1.5 text-sm">
                  <span className="truncate">
                    {e.title}
                    {e.company && e.company !== 'N/A' && <span className="text-muted"> · {e.company}</span>}
                  </span>
                  <span className="ml-2 shrink-0 text-xs text-muted">
                    {e.startYear ?? '—'} – {e.isCurrent ? 'présent' : (e.endYear ?? '—')}
                  </span>
                </div>
              ))}
              <p className="text-xs text-muted">
                {result.experiencesAdded > 0
                  ? `Ajoutées à ton profil (page Parcours).`
                  : `Déjà présentes sur ton profil — supprime-les dans Parcours puis réimporte pour les recréer.`}
              </p>
            </div>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            {result.extraction.skills.map((s) => (
              <span
                key={s.name}
                className={`rounded-full px-3 py-1 text-sm ${
                  s.inferred ? 'bg-amber-100 text-amber-800' : 'bg-brand-fg text-brand'
                }`}
                title={s.inferred ? 'Déduit (à confirmer)' : 'Explicite'}
              >
                {s.name}
                {s.inferred && ' *'}
              </span>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted">
            * déduit par l’IA — modifiable dans la page Parcours. Ton score se met à jour
            automatiquement dans le Dashboard.
          </p>

          {result.careerMatches.length > 0 && (
            <div className="mt-6 border-t border-border pt-5">
              <div className="text-sm font-medium">Métiers correspondant à ce CV</div>
              <p className="mt-1 text-xs text-muted">
                Basé uniquement sur ce document — indépendant de l’explorateur de ton profil.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {result.careerMatches.map((c) => (
                  <span
                    key={`${c.sector}-${c.role}`}
                    className={`rounded-full px-3 py-1 text-sm font-medium ${
                      c.score >= 70
                        ? 'bg-emerald-100 text-emerald-800'
                        : c.score >= 40
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                    }`}
                    title={c.sector}
                  >
                    {c.role} · {c.score}%
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <CareerExplorer />
      <OfferMatchCard />
    </div>
  );
}
