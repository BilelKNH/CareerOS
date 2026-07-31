'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints, Experience, Skill } from '@/lib/api-client';
import { ExperienceForm } from '@/components/experiences/ExperienceForm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

const CATEGORY_LABELS: Record<string, string> = {
  language: 'Langages',
  framework: 'Frameworks',
  tool: 'Outils',
  cloud: 'Cloud',
  soft: 'Savoir-être',
  methodology: 'Méthodes & métier',
};
const CATEGORY_ORDER = ['language', 'framework', 'tool', 'cloud', 'methodology', 'soft'];

function SkillsSection() {
  const qc = useQueryClient();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('methodology');
  const [confirmClear, setConfirmClear] = useState(false);

  const { data: skills = [], isLoading } = useQuery({ queryKey: ['skills'], queryFn: endpoints.skills });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['skills'] });
    qc.invalidateQueries({ queryKey: ['careers'] });
  };

  const add = useMutation({
    mutationFn: () => endpoints.addSkill(name, category),
    onSuccess: () => {
      setName('');
      invalidate();
    },
  });
  const del = useMutation({
    mutationFn: (id: string) => endpoints.deleteSkill(id),
    onSuccess: invalidate,
  });
  const clear = useMutation({
    mutationFn: () => endpoints.clearSkills(),
    onSuccess: () => {
      setConfirmClear(false);
      invalidate();
    },
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Skill[]>();
    for (const s of skills) {
      const key = CATEGORY_LABELS[s.category] ? s.category : 'methodology';
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({
      category: c,
      label: CATEGORY_LABELS[c],
      items: map.get(c)!.sort((a, b) => a.name.localeCompare(b.name)),
    }));
  }, [skills]);

  return (
    <section className="card p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Compétences</h2>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted">{skills.length} au total · dédoublonnage automatique</span>
          {skills.length > 0 && (
            <button
              onClick={() => setConfirmClear(true)}
              className="text-xs text-rose-600 hover:underline"
            >
              Tout réinitialiser
            </button>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <input
          className="min-w-[180px] flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm"
          placeholder="Ajouter une compétence…"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && name.trim() && add.mutate()}
        />
        <select
          className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORY_ORDER.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABELS[c]}
            </option>
          ))}
        </select>
        <button
          onClick={() => name.trim() && add.mutate()}
          disabled={add.isPending}
          className="btn-primary text-sm disabled:opacity-50"
        >
          Ajouter
        </button>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-muted">Chargement…</p>
      ) : skills.length === 0 ? (
        <p className="mt-4 text-sm text-muted">
          Aucune compétence. Ajoute-en une, ou importe ton CV pour les extraire automatiquement.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          {grouped.map(({ category: c, label, items }) => (
            <div key={c}>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">{label}</div>
              <div className="flex flex-wrap gap-2">
                {items.map((s) => (
                  <span
                    key={s.id}
                    className="group inline-flex items-center gap-1.5 rounded-full bg-background px-3 py-1 text-sm"
                  >
                    {s.name}
                    <button
                      onClick={() => del.mutate(s.id)}
                      title="Retirer"
                      className="text-muted opacity-60 transition hover:text-rose-600 hover:opacity-100"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={confirmClear}
        title="Réinitialiser toutes les compétences ?"
        message="Toutes les compétences de ton profil seront supprimées. Réimporte ton CV ensuite pour repartir sur une base propre. (Tes expériences ne sont pas touchées.)"
        confirmLabel="Tout supprimer"
        tone="danger"
        onConfirm={() => clear.mutate()}
        onCancel={() => setConfirmClear(false)}
      />
    </section>
  );
}

export default function ParcoursPage() {
  const qc = useQueryClient();
  const { data: experiences = [], isLoading } = useQuery({
    queryKey: ['experiences'],
    queryFn: endpoints.experiences,
  });

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Experience | null>(null);
  const [deleting, setDeleting] = useState<Experience | null>(null);
  const [error, setError] = useState<string | null>(null);

  const del = useMutation({
    mutationFn: (id: string) => endpoints.deleteExperience(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['experiences'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      setDeleting(null);
      setError(null);
    },
    onError: (e) => {
      setDeleting(null);
      setError(e instanceof Error ? e.message : 'Suppression impossible');
    },
  });

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (e: Experience) => {
    setEditing(e);
    setFormOpen(true);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Parcours</h1>
          <p className="text-sm text-muted">
            Tes expériences et tes compétences au même endroit — remplies automatiquement depuis ton
            CV, éditables à tout moment.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/cv" className="btn-ghost text-sm">
            Importer un CV
          </Link>
          <button onClick={openAdd} className="btn-primary text-sm">
            + Expérience
          </button>
        </div>
      </header>

      {error && (
        <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700">
          {error} — recharge la page (Ctrl+Maj+R) puis réessaie.
        </div>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Expériences</h2>
          <span className="text-xs text-muted">
            Années d’expérience recalculées (périodes sans chevauchement)
          </span>
        </div>

        {isLoading ? (
          <p className="text-sm text-muted">Chargement…</p>
        ) : experiences.length === 0 ? (
          <div className="card p-8 text-center">
            <p className="text-sm text-muted">Aucune expérience pour le moment.</p>
            <div className="mt-4 flex justify-center gap-2">
              <button onClick={openAdd} className="btn-primary">
                Ajouter manuellement
              </button>
              <Link href="/cv" className="btn-ghost">
                Importer mon CV
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {experiences.map((e) => (
              <div key={e.id} className="card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="font-medium">
                    {e.title} · {e.company}
                    {e.source === 'ai_inferred' && (
                      <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                        importé du CV
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="whitespace-nowrap text-sm text-muted">
                      {new Date(e.startDate).getFullYear()} –{' '}
                      {e.isCurrent || !e.endDate ? 'présent' : new Date(e.endDate).getFullYear()}
                    </span>
                    <button onClick={() => openEdit(e)} className="text-sm text-brand hover:underline">
                      Modifier
                    </button>
                    <button onClick={() => setDeleting(e)} className="text-sm text-rose-600 hover:underline">
                      Suppr.
                    </button>
                  </div>
                </div>
                {e.description && <p className="mt-1 text-sm text-muted">{e.description}</p>}
                {e.technologies.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {e.technologies.map((t) => (
                      <span key={t} className="rounded bg-background px-2 py-0.5 text-xs">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      <SkillsSection />

      {formOpen && <ExperienceForm experience={editing} onClose={() => setFormOpen(false)} />}

      <ConfirmDialog
        open={!!deleting}
        title="Supprimer cette expérience ?"
        message={`« ${deleting?.title} · ${deleting?.company} » sera supprimée définitivement.`}
        confirmLabel="Supprimer"
        tone="danger"
        onConfirm={() => deleting && del.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
