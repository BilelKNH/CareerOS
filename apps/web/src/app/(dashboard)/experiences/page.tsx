'use client';

import Link from 'next/link';
import { useMemo, useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints, Experience, Skill, Preferences } from '@/lib/api-client';
import { categoryColor } from '@/lib/colors';
import { ExperienceForm } from '@/components/experiences/ExperienceForm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const GROUPS: { label: string; cats: string[] }[] = [
  { label: 'Frameworks & langages', cats: ['language', 'framework'] },
  { label: 'Outils & méthodes', cats: ['tool', 'cloud', 'methodology'] },
  { label: 'Savoir-être', cats: ['soft'] },
];

function levelDots(level?: string) {
  const l = (level || '').toLowerCase();
  if (/expert|avanc|senior|confirm/.test(l)) return 3;
  if (/debut|junior|notion|basique/.test(l)) return 1;
  return 2;
}
const initial = (name?: string | null) => (name?.trim()?.[0] ?? 'B').toUpperCase();

function Dots({ n }: { n: number }) {
  return (
    <span className="inline-flex gap-0.5">
      {[0, 1, 2].map((i) => (
        <span key={i} className="h-[5px] w-[5px] rounded-full" style={{ background: i < n ? 'rgb(var(--brand))' : 'rgb(var(--border))' }} />
      ))}
    </span>
  );
}

function prefTags(p?: Preferences | null): string[] {
  if (!p) return [];
  const t: string[] = [];
  if (p.locations?.length) t.push(...p.locations.slice(0, 2));
  if (p.remote) t.push(p.remote === 'remote' ? 'remote' : p.remote === 'hybrid' ? 'hybride' : 'sur site');
  if (p.contractTypes?.length) t.push(p.contractTypes.join(' + '));
  if (p.tjmMin && p.tjmMax) t.push(`TJM ${p.tjmMin}–${p.tjmMax} €`);
  return t;
}

export default function ParcoursPage() {
  const qc = useQueryClient();
  const [mode, setMode] = useState<'read' | 'edit'>('read');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Experience | null>(null);
  const [deleting, setDeleting] = useState<Experience | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [skillName, setSkillName] = useState('');
  const [skillCat, setSkillCat] = useState('methodology');
  const [error, setError] = useState<string | null>(null);
  const [importMsg, setImportMsg] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: endpoints.profile });
  const { data: preferences } = useQuery({ queryKey: ['preferences'], queryFn: endpoints.preferences });
  const { data: experiences = [], isLoading } = useQuery({ queryKey: ['experiences'], queryFn: endpoints.experiences });
  const { data: skills = [] } = useQuery({ queryKey: ['skills'], queryFn: endpoints.skills });

  const invalidateSkills = () => {
    qc.invalidateQueries({ queryKey: ['skills'] });
    qc.invalidateQueries({ queryKey: ['careers'] });
  };
  const delExp = useMutation({
    mutationFn: (id: string) => endpoints.deleteExperience(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['experiences'] }); qc.invalidateQueries({ queryKey: ['dashboard'] }); setDeleting(null); },
    onError: (e) => { setDeleting(null); setError(e instanceof Error ? e.message : 'Suppression impossible'); },
  });
  const addSkill = useMutation({ mutationFn: () => endpoints.addSkill(skillName, skillCat), onSuccess: () => { setSkillName(''); invalidateSkills(); } });
  const delSkill = useMutation({ mutationFn: (id: string) => endpoints.deleteSkill(id), onSuccess: invalidateSkills });
  const clearSkills = useMutation({ mutationFn: () => endpoints.clearSkills(), onSuccess: () => { setConfirmClear(false); invalidateSkills(); } });

  const importCv = useMutation({
    mutationFn: (f: File) => endpoints.importCv(f),
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['experiences'] });
      qc.invalidateQueries({ queryKey: ['skills'] });
      qc.invalidateQueries({ queryKey: ['careers'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['profile'] });
      const exp =
        r.experiencesAdded > 0
          ? `${r.experiencesAdded} expérience(s)`
          : r.experiencesFound > 0
            ? 'expériences déjà présentes'
            : 'aucune expérience détectée';
      setImportMsg(`CV analysé : ${r.addedSkills.length} compétence(s) ajoutée(s), ${exp}.`);
    },
    onError: (e) => setImportMsg(e instanceof Error ? `Import échoué : ${e.message}` : 'Import échoué'),
  });

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (f) { setImportMsg(null); importCv.mutate(f); }
  };

  const grouped = useMemo(() => {
    return GROUPS.map((g) => ({
      ...g,
      items: skills
        .filter((s) => g.cats.includes(s.category) || (g.label === 'Frameworks & langages' && !GROUPS.some((x) => x.cats.includes(s.category))))
        .sort((a, b) => a.name.localeCompare(b.name)),
    })).filter((g) => g.items.length);
  }, [skills]);

  const openAdd = () => { setEditing(null); setFormOpen(true); };
  const edit = mode === 'edit';

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="kicker">Profil</div>
          <h1 className="mt-1.5 text-[27px]">Parcours</h1>
          <p className="mt-1.5 max-w-[64ch] text-[13px] text-muted">
            Expériences, compétences et préférences — la mémoire que votre agent utilise pour matcher et candidater.
          </p>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2.5">
          <div className="inline-flex overflow-hidden rounded-lg border border-border text-xs">
            {(['read', 'edit'] as const).map((m, i) => (
              <button key={m} onClick={() => setMode(m)}
                className={`px-3 py-1.5 font-medium ${i > 0 ? 'border-l border-border' : ''} ${mode === m ? 'text-brand' : 'text-muted hover:text-foreground'}`}
                style={mode === m ? { boxShadow: 'inset 0 0 0 1px rgb(var(--brand))' } : undefined}>
                {m === 'read' ? 'Lecture' : 'Édition'}
              </button>
            ))}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.docx,.txt"
            className="hidden"
            onChange={onPickFile}
          />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importCv.isPending}
            className="btn-secondary disabled:opacity-60"
          >
            {importCv.isPending ? 'Analyse en cours…' : 'Importer un CV'}
          </button>
          <button onClick={openAdd} className="btn-primary">+ Expérience</button>
        </div>
      </header>

      {error && <div className="rounded-lg bg-rose-500/10 p-3 text-sm text-rose-400">{error}</div>}

      {(importCv.isPending || importMsg) && (
        <div
          className="flex items-center gap-2.5 rounded-lg p-3 text-sm"
          style={{ background: 'color-mix(in srgb, rgb(var(--brand)) 8%, transparent)' }}
        >
          {importCv.isPending && (
            <span className="h-2 w-2 animate-pulse rounded-full bg-brand" />
          )}
          <span className={importCv.isPending ? 'text-foreground/80' : 'text-foreground/80'}>
            {importCv.isPending
              ? 'Analyse du CV en arrière-plan — tu peux continuer à travailler, la page se met à jour toute seule.'
              : importMsg}
          </span>
          {!importCv.isPending && importMsg && (
            <button onClick={() => setImportMsg(null)} className="ml-auto text-muted hover:text-foreground" aria-label="Fermer">×</button>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-start gap-6">
        {/* Colonne gauche : profil + expériences */}
        <div className="min-w-0 flex-1">
          <section className="card mb-5 flex flex-row items-center gap-4 p-5">
            <span className="grid h-14 w-14 flex-shrink-0 place-items-center rounded-full text-xl font-medium" style={{ background: 'rgb(var(--brand-fg))', color: 'rgb(var(--brand))' }}>
              {initial(profile?.fullName)}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[17px] font-medium">{profile?.fullName || 'Votre profil'}</div>
              <div className="mt-0.5 text-[13px] text-muted">
                {[profile?.headline, profile?.yearsExperience ? `${profile.yearsExperience} ans d’expérience` : null].filter(Boolean).join(' · ')}
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {prefTags(preferences).map((t) => <span key={t} className="tag-neutral">{t}</span>)}
              </div>
            </div>
            <div className="flex-shrink-0 text-right">
              <div className="text-2xl font-medium">{profile?.employabilityScore ?? 0}<span className="text-[13px] text-muted">/100</span></div>
              <div className="text-[11px] text-muted">employabilité</div>
            </div>
          </section>

          <h6 className="mb-3 text-muted">Expériences</h6>
          {isLoading ? (
            <p className="text-sm text-muted">Chargement…</p>
          ) : experiences.length === 0 ? (
            <div className="card p-8 text-center">
              <p className="text-sm text-muted">Aucune expérience.</p>
              <div className="mt-4 flex justify-center gap-2">
                <button onClick={openAdd} className="btn-primary">Ajouter</button>
                <button onClick={() => fileRef.current?.click()} className="btn-secondary">Importer mon CV</button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col">
              {experiences.map((e, i) => {
                const last = i === experiences.length - 1;
                return (
                  <div key={e.id} className="flex gap-3.5">
                    <div className="flex flex-shrink-0 flex-col items-center">
                      <span className="mt-1 h-2.5 w-2.5 rounded-full border-2" style={{ borderColor: i === 0 ? 'rgb(var(--brand))' : 'rgb(var(--muted))', background: i === 0 ? 'rgb(var(--brand))' : 'transparent' }} />
                      {!last && <span className="mt-1.5 w-px flex-1" style={{ background: 'rgb(var(--border))' }} />}
                    </div>
                    <div className="min-w-0 pb-5">
                      <div className="text-[11px] text-muted">
                        {new Date(e.startDate).getFullYear()} — {e.isCurrent || !e.endDate ? 'aujourd’hui' : new Date(e.endDate).getFullYear()}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2 text-sm font-medium">
                        {e.title} · {e.company}
                        {e.source === 'ai_inferred' && <span className="agent-badge">agent</span>}
                      </div>
                      {e.description && <p className="mt-1 max-w-[60ch] text-[13px] leading-relaxed text-muted">{e.description}</p>}
                      {e.technologies.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {e.technologies.map((t) => <span key={t} className="tag-neutral">{t}</span>)}
                        </div>
                      )}
                      {edit && (
                        <div className="mt-1.5 flex gap-3">
                          <button onClick={() => { setEditing(e); setFormOpen(true); }} className="btn-ghost text-xs">Modifier</button>
                          <button onClick={() => setDeleting(e)} className="btn-ghost text-xs" style={{ color: 'rgb(var(--muted))' }}>Supprimer</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Rail droit : compétences + préférences */}
        <aside className="flex w-full flex-shrink-0 flex-col gap-3.5 lg:w-[360px]">
          <section className="card p-4">
            <div className="flex items-center justify-between">
              <h6 className="text-muted">Compétences · {skills.length}</h6>
              {edit && skills.length > 0 && (
                <button onClick={() => setConfirmClear(true)} className="btn-ghost text-xs" style={{ color: 'rgb(var(--muted))' }}>Tout réinitialiser</button>
              )}
            </div>

            {edit && (
              <div className="mt-2 flex gap-2">
                <input className="input h-8 flex-1 text-[13px]" placeholder="Ajouter…" value={skillName}
                  onChange={(e) => setSkillName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && skillName.trim() && addSkill.mutate()} />
                <select className="input h-8 w-28 text-[13px]" value={skillCat} onChange={(e) => setSkillCat(e.target.value)}>
                  <option value="language">Langage</option>
                  <option value="framework">Framework</option>
                  <option value="tool">Outil</option>
                  <option value="cloud">Cloud</option>
                  <option value="methodology">Méthode</option>
                  <option value="soft">Savoir-être</option>
                </select>
                <button onClick={() => skillName.trim() && addSkill.mutate()} className="btn-primary text-xs">Ajouter</button>
              </div>
            )}

            {grouped.map((g) => (
              <div key={g.label}>
                <div className="mb-0.5 mt-2.5 flex items-center gap-1.5 text-[11px] text-muted">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: categoryColor(g.label) }} />
                  {g.label}
                </div>
                {g.items.map((s: Skill) => (
                  <div key={s.id} className="flex items-center gap-2.5 border-b border-border/50 py-1.5 last:border-0">
                    <span className="flex-1 text-[13px]">{s.name}</span>
                    <Dots n={levelDots(s.level)} />
                    <span className="w-[34px] text-right text-[11px] text-muted">{s.years ? `${s.years}` : '—'}</span>
                    <span className="w-11 text-right">
                      {s.source === 'ai_inferred'
                        ? <span className="agent-badge">agent</span>
                        : <span className="text-[10px] text-muted">vous</span>}
                    </span>
                    {edit && (
                      <button onClick={() => delSkill.mutate(s.id)} title="Retirer" className="text-muted transition hover:text-rose-400">×</button>
                    )}
                  </div>
                ))}
              </div>
            ))}
            <div className="mt-2.5 flex items-center gap-1.5 text-[10px] text-muted">
              <span className="agent-badge">agent</span> = ajoutée par l’agent depuis le Journal ou votre CV
            </div>
          </section>

          <section className="card p-4">
            <h6 className="mb-2.5 text-muted">Préférences de recherche</h6>
            <div className="flex flex-col gap-2 text-[13px] text-foreground/80">
              <Row k="Rôles visés" v={preferences?.desiredRoles?.join(' · ') || '—'} />
              <Row k="Zones" v={preferences?.locations?.join(' · ') || '—'} />
              <Row k="Télétravail" v={preferences ? (preferences.remote === 'remote' ? 'remote de préférence' : preferences.remote === 'hybrid' ? 'hybride' : 'sur site') : '—'} />
              <Row k="TJM" v={preferences?.tjmMin && preferences?.tjmMax ? `${preferences.tjmMin} – ${preferences.tjmMax} €` : '—'} />
              <Row k="Mots-clés" v={preferences?.keywords?.join(', ') || '—'} />
            </div>
            <Link href="/settings" className="btn-ghost mt-2.5 self-start text-xs">Modifier dans Paramètres</Link>
          </section>
        </aside>
      </div>

      {formOpen && <ExperienceForm experience={editing} onClose={() => setFormOpen(false)} />}
      <ConfirmDialog open={!!deleting} title="Supprimer cette expérience ?"
        message={`« ${deleting?.title} · ${deleting?.company} » sera supprimée définitivement.`}
        confirmLabel="Supprimer" tone="danger"
        onConfirm={() => deleting && delExp.mutate(deleting.id)} onCancel={() => setDeleting(null)} />
      <ConfirmDialog open={confirmClear} title="Réinitialiser toutes les compétences ?"
        message="Toutes les compétences de ton profil seront supprimées. Réimporte ton CV ensuite pour repartir sur une base propre. (Tes expériences ne sont pas touchées.)"
        confirmLabel="Tout supprimer" tone="danger"
        onConfirm={() => clearSkills.mutate()} onCancel={() => setConfirmClear(false)} />
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted">{k}</span>
      <span className="text-right">{v}</span>
    </div>
  );
}
