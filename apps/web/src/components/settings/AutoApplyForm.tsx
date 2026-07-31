'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints, AutoApplySettings } from '@/lib/api-client';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

export function AutoApplyForm() {
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { data } = useQuery({ queryKey: ['autoApplySettings'], queryFn: endpoints.autoApplySettings });
  const save = useMutation({
    mutationFn: (s: Partial<AutoApplySettings>) => endpoints.updateAutoApplySettings(s),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['autoApplySettings'] }),
  });
  if (!data) return null;

  function onToggleEnabled(checked: boolean) {
    if (checked) setConfirmOpen(true); // confirm before enabling real sending
    else save.mutate({ autoApplyEnabled: false });
  }

  return (
    <section className="rounded-xl border bg-surface p-5 shadow-sm">
      <h2 className="font-medium">Auto-candidature</h2>
      <p className="mb-3 text-sm text-slate-500">
        Désactivée par défaut. Activée, l’agent envoie automatiquement les candidatures au-dessus du
        seuil (dans la limite quotidienne) via le canal choisi. Les autres restent à valider.
      </p>

      <label className="mb-4 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={data.autoApplyEnabled}
          onChange={(e) => onToggleEnabled(e.target.checked)}
        />
        Activer l’envoi automatique
        {data.autoApplyEnabled && (
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">actif</span>
        )}
      </label>

      <div className="flex flex-wrap items-end gap-4">
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Seuil (%)</span>
          <input
            type="number"
            min={50}
            max={100}
            defaultValue={data.autoApplyThreshold}
            onBlur={(e) => save.mutate({ autoApplyThreshold: +e.target.value })}
            className="w-24 rounded-lg border px-3 py-1.5"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Limite / jour</span>
          <input
            type="number"
            min={1}
            max={20}
            defaultValue={data.autoApplyDailyLimit}
            onBlur={(e) => save.mutate({ autoApplyDailyLimit: +e.target.value })}
            className="w-24 rounded-lg border px-3 py-1.5"
          />
        </label>
        <label className="text-sm">
          <span className="mb-1 block text-slate-600">Canal</span>
          <select
            defaultValue={data.autoApplyChannel}
            onChange={(e) =>
              save.mutate({ autoApplyChannel: e.target.value as AutoApplySettings['autoApplyChannel'] })
            }
            className="rounded-lg border px-3 py-1.5"
          >
            <option value="manual">Manuel (dossier prêt)</option>
            <option value="email">Email (si contact connu)</option>
            <option value="external_url">Lien externe</option>
          </select>
        </label>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Activer l’envoi automatique ?"
        message={`L’agent enverra automatiquement des candidatures pour les offres au-dessus de ${data.autoApplyThreshold}% (max ${data.autoApplyDailyLimit}/jour) via le canal « ${data.autoApplyChannel} ». Tu pourras désactiver à tout moment.`}
        confirmLabel="Oui, activer"
        tone="danger"
        onConfirm={() => {
          save.mutate({ autoApplyEnabled: true });
          setConfirmOpen(false);
        }}
        onCancel={() => setConfirmOpen(false)}
      />
    </section>
  );
}
