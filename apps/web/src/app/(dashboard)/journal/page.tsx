'use client';

import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints, Extraction, JournalEntry } from '@/lib/api-client';

type Filter = 'all' | 'applied' | 'pending';

function titleOf(raw: string) {
  const first = raw.split(/[.\n]/)[0].trim();
  return first.length > 70 ? first.slice(0, 68) + '…' : first || 'Entrée';
}
function fdate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const same = d.toDateString() === today.toDateString();
  return same
    ? `Aujourd’hui · ${d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
    : d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
}

export default function JournalPage() {
  const qc = useQueryClient();
  const [text, setText] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [extraction, setExtraction] = useState<Extraction | null>(null);
  const [entryId, setEntryId] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const { data: entries = [] } = useQuery({ queryKey: ['journal'], queryFn: endpoints.journal });

  const analyze = useMutation({
    mutationFn: () => endpoints.createJournal(text, false),
    onSuccess: (res) => {
      setExtraction(res.extraction);
      setEntryId(res.entry.id);
      setStatus(null);
      qc.invalidateQueries({ queryKey: ['journal'] });
    },
    onError: (e) => setStatus(e instanceof Error ? e.message : 'Erreur'),
  });

  const apply = useMutation({
    mutationFn: () => endpoints.applyJournal(entryId!),
    onSuccess: (res) => {
      setStatus(`Fusionné : ${res.addedSkills.length} compétence(s) · employabilité ${res.employabilityScore}/100`);
      setExtraction(null);
      setEntryId(null);
      setText('');
      ['journal', 'skills', 'careers', 'dashboard', 'profile'].forEach((k) => qc.invalidateQueries({ queryKey: [k] }));
    },
    onError: (e) => setStatus(e instanceof Error ? e.message : 'Erreur'),
  });

  const list = useMemo(() => {
    if (filter === 'applied') return entries.filter((e) => e.applied);
    if (filter === 'pending') return entries.filter((e) => !e.applied);
    return entries;
  }, [entries, filter]);

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all', label: 'Tout' },
    { key: 'applied', label: 'Fusionnés' },
    { key: 'pending', label: 'À fusionner' },
  ];

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker">Mémoire</div>
          <h1 className="mt-1.5 text-[27px]">Career Journal</h1>
          <p className="mt-1.5 max-w-[64ch] text-[13px] text-muted">
            Écrivez librement ce que vous avez fait. L’Agent Mémoire extrait compétences et résultats — vous validez avant fusion au profil.
          </p>
        </div>
        <div className="inline-flex flex-shrink-0 overflow-hidden rounded-lg border border-border text-xs">
          {FILTERS.map((f, i) => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 font-medium ${i > 0 ? 'border-l border-border' : ''} ${filter === f.key ? 'text-brand' : 'text-muted hover:text-foreground'}`}
              style={filter === f.key ? { boxShadow: 'inset 0 0 0 1px rgb(var(--brand))' } : undefined}>
              {f.label}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap items-start gap-6">
        <div className="min-w-0 flex-1">
          {/* Compose */}
          <section className="card mb-6 p-4">
            <textarea
              className="input min-h-[76px]"
              placeholder="Aujourd’hui, j’ai…"
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="mt-2.5 flex flex-wrap items-center gap-2.5">
              <button onClick={() => analyze.mutate()} disabled={analyze.isPending || text.trim().length < 3} className="btn-primary">
                {analyze.isPending ? 'Analyse…' : 'Analyser'}
              </button>
              <span className="text-[11px] text-muted">l’extraction distingue faits explicites et déductions</span>
              {status && <span className="ml-auto text-xs text-ok">{status}</span>}
            </div>
          </section>

          {/* Timeline */}
          {list.length === 0 ? (
            <p className="text-sm text-muted">
              {entries.length === 0 ? 'Aucune entrée — écris ta première ligne ci-dessus.' : 'Rien dans ce filtre.'}
            </p>
          ) : (
            <div className="flex flex-col">
              {list.map((e: JournalEntry, i) => (
                <div key={e.id} className="flex gap-3.5">
                  <div className="flex flex-shrink-0 flex-col items-center">
                    <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-surface text-brand" style={{ boxShadow: 'var(--shadow-card)' }}>
                      <svg width="14" height="14" viewBox="0 0 256 256" fill="currentColor" aria-hidden>
                        <path d="M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120Z" />
                      </svg>
                    </span>
                    {i < list.length - 1 && <span className="mt-1.5 w-px flex-1" style={{ background: 'rgb(var(--border))' }} />}
                  </div>
                  <div className="min-w-0 flex-1 pb-5">
                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted">
                      {fdate(e.createdAt)}
                      {e.applied
                        ? <span className="agent-badge">fusionné au profil</span>
                        : <span className="tag-neutral">à fusionner</span>}
                    </div>
                    <div className="mt-1 text-sm font-medium">{titleOf(e.rawText)}</div>
                    <p className="mt-0.5 max-w-[64ch] text-[13px] leading-relaxed text-muted">{e.rawText}</p>
                    {e.extractedSkills.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {e.extractedSkills.slice(0, 8).map((s) => <span key={s} className="tag-neutral">{s}</span>)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Panneau extraction */}
        {extraction && (
          <aside className="card glow-accent w-full flex-shrink-0 self-start p-4 lg:w-[330px]">
            <div className="flex items-center gap-2">
              <span className="agent-badge">Extraction</span>
              <span className="text-[11px] text-muted">{extraction.method === 'llm' ? 'IA' : 'heuristique'}</span>
            </div>
            {extraction.summary && <p className="mt-2.5 text-[13px] leading-relaxed text-foreground/80">{extraction.summary}</p>}

            <div className="mt-3 text-[11px] text-muted">Compétences explicites</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {extraction.skills.filter((s) => !s.inferred).map((s) => <span key={s.name} className="chip">{s.name}</span>)}
              {extraction.skills.filter((s) => !s.inferred).length === 0 && <span className="text-xs text-muted">—</span>}
            </div>

            <div className="mt-2.5 text-[11px] text-muted">Déduites — à confirmer</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {extraction.skills.filter((s) => s.inferred).map((s) => <span key={s.name} className="tag-outline">{s.name}</span>)}
              {extraction.skills.filter((s) => s.inferred).length === 0 && <span className="text-xs text-muted">—</span>}
            </div>

            <div className="mt-3.5 flex gap-2">
              <button onClick={() => apply.mutate()} disabled={apply.isPending} className="btn-primary">
                {apply.isPending ? 'Fusion…' : 'Fusionner au profil'}
              </button>
              <button onClick={() => { setExtraction(null); setEntryId(null); }} className="btn-ghost">Annuler</button>
            </div>
            <p className="mt-2.5 text-[11px] leading-relaxed text-muted">
              La fusion met à jour compétences et score d’employabilité. Réversible depuis le Parcours.
            </p>
          </aside>
        )}
      </div>
    </div>
  );
}
