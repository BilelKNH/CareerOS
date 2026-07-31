'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints, Preferences } from '@/lib/api-client';

const EMPTY: Preferences = {
  desiredRoles: [],
  locations: [],
  remote: 'hybrid',
  searchRadiusKm: 30,
  contractTypes: [],
  tjmMin: null,
  tjmMax: null,
  keywords: [],
};

const toList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-slate-600">{label}</span>
      {children}
    </label>
  );
}

export function PreferencesForm() {
  const qc = useQueryClient();
  const { data } = useQuery({ queryKey: ['preferences'], queryFn: endpoints.preferences });
  const [form, setForm] = useState<Preferences>(EMPTY);

  useEffect(() => {
    if (data) setForm({ ...EMPTY, ...data });
  }, [data]);

  const save = useMutation({
    // Send only editable fields — the fetched record also carries id/userId/
    // timestamps which the API rejects (forbidNonWhitelisted).
    mutationFn: () =>
      endpoints.updatePreferences({
        desiredRoles: form.desiredRoles,
        locations: form.locations,
        remote: form.remote,
        searchRadiusKm: form.searchRadiusKm,
        contractTypes: form.contractTypes,
        tjmMin: form.tjmMin,
        tjmMax: form.tjmMax,
        keywords: form.keywords,
      }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['preferences'] }),
  });

  return (
    <section className="space-y-4 rounded-xl border bg-surface p-5 shadow-sm">
      <div>
        <h2 className="font-medium">Préférences d’emploi</h2>
        <p className="text-sm text-slate-500">Utilisées par la veille, le matching et le filtrage géo.</p>
      </div>

      <Field label="Rôles visés (virgules)">
        <input
          className="w-full rounded-lg border px-3 py-2"
          defaultValue={form.desiredRoles.join(', ')}
          onChange={(e) => setForm({ ...form, desiredRoles: toList(e.target.value) })}
        />
      </Field>
      <Field label="Localisations">
        <input
          className="w-full rounded-lg border px-3 py-2"
          defaultValue={form.locations.join(', ')}
          onChange={(e) => setForm({ ...form, locations: toList(e.target.value) })}
        />
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Télétravail">
          <select
            className="w-full rounded-lg border px-3 py-2"
            value={form.remote}
            onChange={(e) => setForm({ ...form, remote: e.target.value as Preferences['remote'] })}
          >
            <option value="onsite">Sur site</option>
            <option value="hybrid">Hybride</option>
            <option value="remote">Remote</option>
          </select>
        </Field>
        <Field label="Types de contrat">
          <input
            className="w-full rounded-lg border px-3 py-2"
            defaultValue={form.contractTypes.join(', ')}
            onChange={(e) => setForm({ ...form, contractTypes: toList(e.target.value) })}
          />
        </Field>
      </div>

      <Field label={`Rayon de recherche autour de ta ville : ${form.searchRadiusKm} km`}>
        <input
          type="range"
          min={0}
          max={200}
          step={10}
          value={form.searchRadiusKm}
          onChange={(e) => setForm({ ...form, searchRadiusKm: +e.target.value })}
          className="w-full"
        />
        <div className="flex justify-between text-xs text-muted">
          <span>0 (national)</span>
          <span>200 km</span>
        </div>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="TJM min (€)">
          <input
            type="number"
            className="w-full rounded-lg border px-3 py-2"
            defaultValue={form.tjmMin ?? ''}
            onChange={(e) => setForm({ ...form, tjmMin: e.target.value ? +e.target.value : null })}
          />
        </Field>
        <Field label="TJM max (€)">
          <input
            type="number"
            className="w-full rounded-lg border px-3 py-2"
            defaultValue={form.tjmMax ?? ''}
            onChange={(e) => setForm({ ...form, tjmMax: e.target.value ? +e.target.value : null })}
          />
        </Field>
      </div>
      <Field label="Mots-clés">
        <input
          className="w-full rounded-lg border px-3 py-2"
          defaultValue={form.keywords.join(', ')}
          onChange={(e) => setForm({ ...form, keywords: toList(e.target.value) })}
        />
      </Field>

      <div>
        <button
          onClick={() => save.mutate()}
          disabled={save.isPending}
          className="rounded-lg bg-brand px-4 py-2 font-medium text-white disabled:opacity-50"
        >
          {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
        {save.isSuccess && <span className="ml-3 text-sm text-emerald-600">Enregistré ✓</span>}
      </div>
    </section>
  );
}
