'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints, Experience, ExperienceInput } from '@/lib/api-client';

const toList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);
const day = (iso?: string | null) => (iso ? iso.slice(0, 10) : '');

export function ExperienceForm({
  experience,
  onClose,
}: {
  experience: Experience | null;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [title, setTitle] = useState(experience?.title ?? '');
  const [company, setCompany] = useState(experience?.company ?? '');
  const [startDate, setStartDate] = useState(day(experience?.startDate) || `${new Date().getFullYear()}-01-01`);
  const [endDate, setEndDate] = useState(day(experience?.endDate));
  const [isCurrent, setIsCurrent] = useState(experience?.isCurrent ?? false);
  const [description, setDescription] = useState(experience?.description ?? '');
  const [technologies, setTechnologies] = useState((experience?.technologies ?? []).join(', '));
  const [error, setError] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: () => {
      const payload: ExperienceInput = {
        title: title.trim(),
        company: company.trim(),
        startDate,
        endDate: isCurrent || !endDate ? null : endDate,
        isCurrent,
        description: description.trim(),
        technologies: toList(technologies),
      };
      return experience
        ? endpoints.updateExperience(experience.id, payload)
        : endpoints.createExperience(payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['experiences'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : 'Erreur'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="card w-full max-w-lg space-y-3 p-6">
        <h2 className="text-lg font-semibold">
          {experience ? 'Modifier l’expérience' : 'Ajouter une expérience'}
        </h2>

        <div className="grid grid-cols-2 gap-3">
          <label className="col-span-2 text-sm">
            <span className="mb-1 block text-muted">Poste *</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="col-span-2 text-sm">
            <span className="mb-1 block text-muted">Entreprise *</span>
            <input className="input" value={company} onChange={(e) => setCompany(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Début *</span>
            <input type="date" className="input" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-muted">Fin</span>
            <input
              type="date"
              className="input disabled:opacity-50"
              value={endDate}
              disabled={isCurrent}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </label>
          <label className="col-span-2 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={isCurrent} onChange={(e) => setIsCurrent(e.target.checked)} />
            Poste actuel
          </label>
          <label className="col-span-2 text-sm">
            <span className="mb-1 block text-muted">Description</span>
            <textarea className="input h-20" value={description} onChange={(e) => setDescription(e.target.value)} />
          </label>
          <label className="col-span-2 text-sm">
            <span className="mb-1 block text-muted">Technologies (séparées par des virgules)</span>
            <input className="input" value={technologies} onChange={(e) => setTechnologies(e.target.value)} />
          </label>
        </div>

        {error && <p className="text-sm text-rose-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="btn-ghost text-sm">
            Annuler
          </button>
          <button
            onClick={() => title.trim() && company.trim() && save.mutate()}
            disabled={save.isPending || !title.trim() || !company.trim()}
            className="btn-primary text-sm disabled:opacity-50"
          >
            {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  );
}
