'use client';

import { useState } from 'react';
import { endpoints, Extraction } from '@/lib/api-client';

export default function JournalPage() {
  const [text, setText] = useState(
    'J’ai mis en place un pipeline GitHub Actions pour automatiser les tests Playwright.',
  );
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function analyze() {
    setLoading(true);
    setStatus(null);
    try {
      const res = await endpoints.createJournal(text, false);
      setExtraction(res.extraction);
      setEntryId(res.entry.id);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  async function apply() {
    if (!entryId) return;
    setLoading(true);
    try {
      const res = await endpoints.applyJournal(entryId);
      setStatus(
        `Profil mis à jour : ${res.addedSkills.length} compétences fusionnées · score d’employabilité ${res.employabilityScore}/100`,
      );
    } catch (e) {
      setStatus(e instanceof Error ? e.message : 'Erreur');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Career Journal</h1>
        <p className="text-sm text-slate-500">
          Écris librement ce que tu as fait. L’Agent Mémoire extrait compétences, technologies et
          résultats, puis met à jour ton profil.
        </p>
      </header>

      <textarea
        className="h-32 w-full rounded-xl border p-4"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="flex gap-3">
        <button
          onClick={analyze}
          disabled={loading || text.trim().length < 3}
          className="rounded-lg bg-brand px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          Analyser
        </button>
        {extraction && (
          <button
            onClick={apply}
            disabled={loading}
            className="rounded-lg border border-brand px-4 py-2 font-medium text-brand disabled:opacity-50"
          >
            Appliquer au profil
          </button>
        )}
      </div>

      {status && <div className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{status}</div>}

      {extraction && (
        <div className="rounded-xl border bg-surface p-5 shadow-sm">
          <div className="mb-1 text-xs uppercase text-slate-400">
            Extraction ({extraction.method === 'llm' ? 'IA' : 'heuristique'})
          </div>
          <p className="mb-4 text-sm text-slate-600">{extraction.summary}</p>

          <div className="mb-2 text-sm font-medium">Compétences détectées</div>
          <div className="flex flex-wrap gap-2">
            {extraction.skills.map((s) => (
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
          <p className="mt-3 text-xs text-slate-400">
            * déduit par l’IA — distingué des faits explicites, modifiable manuellement.
          </p>
        </div>
      )}
    </div>
  );
}
