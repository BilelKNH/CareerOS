'use client';

import { useEffect, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints, AutoApplySettings, Preferences } from '@/lib/api-client';
import { PreferencesForm } from '@/components/settings/PreferencesForm';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { SectionCard, Row, Toggle, Segment, NumberField, useLocal } from '@/components/settings/controls';

type ThemeMode = 'dark' | 'light' | 'auto';

function applyTheme(mode: ThemeMode) {
  const root = document.documentElement;
  root.classList.add('theme-transition');
  if (mode === 'auto') {
    localStorage.removeItem('theme');
    root.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches);
  } else {
    localStorage.setItem('theme', mode);
    root.classList.toggle('dark', mode === 'dark');
  }
  window.setTimeout(() => root.classList.remove('theme-transition'), 350);
}

export default function SettingsPage() {
  const qc = useQueryClient();

  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: endpoints.profile });
  const { data: agent } = useQuery({ queryKey: ['agentSettings'], queryFn: endpoints.agentSettingsGet });
  const { data: digest } = useQuery({ queryKey: ['agentDigest'], queryFn: endpoints.agentDigest });
  const { data: auto } = useQuery({ queryKey: ['autoApplySettings'], queryFn: endpoints.autoApplySettings });
  const { data: prefs } = useQuery({ queryKey: ['preferences'], queryFn: endpoints.preferences });

  const agentEnabled = agent?.autonomousAgentEnabled ?? false;

  const toggleAgent = useMutation({
    mutationFn: (v: boolean) => endpoints.agentSettings(v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['agentSettings'] }),
  });
  const runNow = useMutation({
    mutationFn: endpoints.agentRun,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agentDigest'] });
      qc.invalidateQueries({ queryKey: ['agentRuns'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
  const saveAuto = useMutation({
    mutationFn: (s: Partial<AutoApplySettings>) => endpoints.updateAutoApplySettings(s),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['autoApplySettings'] }),
  });
  const savePrefs = useMutation({
    mutationFn: (p: Partial<Preferences>) => endpoints.updatePreferences(p),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['preferences'] }),
  });

  // Local-only UI preferences (no backend field).
  const [freq, setFreq] = useLocal<'daily' | 'twice' | 'weekly'>('reas.freq', 'daily');
  const [briefing, setBriefing] = useLocal('reas.briefing', true);
  const [notif, setNotif] = useLocal('reas.notif', { high: true, market: true, reports: true, toasts: false });
  const [lang, setLang] = useLocal<'fr' | 'en'>('reas.lang', 'fr');

  const [theme, setTheme] = useState<ThemeMode>('auto');
  useEffect(() => {
    const t = localStorage.getItem('theme');
    setTheme(t === 'dark' ? 'dark' : t === 'light' ? 'light' : 'auto');
  }, []);
  const chooseTheme = (m: ThemeMode) => { setTheme(m); applyTheme(m); };

  const [editPrefs, setEditPrefs] = useState(false);
  const [confirmAuto, setConfirmAuto] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function exportData() {
    const [experiences, skills, applications] = await Promise.all([
      endpoints.experiences(), endpoints.skills(), endpoints.applications(),
    ]);
    const blob = new Blob([JSON.stringify({ profile, preferences: prefs, experiences, skills, applications }, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'reas-export.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  const remoteLabel = (r?: string) => (r === 'remote' ? 'remote de préférence' : r === 'hybrid' ? 'hybride' : 'sur site');

  return (
    <div className="flex flex-col gap-5">
      <header>
        <div className="kicker">Contrôle</div>
        <h1 className="mt-1.5 text-[27px]">Paramètres</h1>
        <p className="mt-1.5 max-w-[64ch] text-[13px] text-muted">
          Vous fixez les règles — l’agent travaille à l’intérieur. Toute action externe reste soumise à votre validation.
        </p>
      </header>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
        {/* Colonne gauche */}
        <div className="flex flex-col gap-5">
          {/* AGENT AUTONOME */}
          <SectionCard
            title="Agent autonome"
            badge={
              <span className={`${agentEnabled ? 'tag-ok' : 'tag-neutral'} text-[10px]`}>
                {agentEnabled ? '• actif' : '• en pause'}
              </span>
            }
          >
            <Row label="Exécution quotidienne" sub="Cycle complet à 06:00 : veille → matching → analyse → préparation">
              <Toggle checked={agentEnabled} onChange={(v) => toggleAgent.mutate(v)} />
            </Row>
            <Row label="Fréquence">
              <Segment
                value={freq}
                onChange={setFreq}
                options={[{ value: 'daily', label: 'Quotidien' }, { value: 'twice', label: '2×/jour' }, { value: 'weekly', label: 'Hebdo' }]}
              />
            </Row>
            <Row label="Briefing par email" sub="Résumé du cycle envoyé chaque matin à 07:00" divide={false}>
              <Toggle checked={briefing} onChange={setBriefing} />
            </Row>
            <div className="mt-3">
              <button onClick={() => runNow.mutate()} disabled={runNow.isPending} className="btn-primary">
                {runNow.isPending ? 'Cycle en cours…' : 'Lancer un cycle maintenant'}
              </button>
              {digest?.metrics && !runNow.isPending && (
                <span className="ml-3 text-xs text-muted">
                  Dernier cycle : {digest.metrics.newOffers} offres · {digest.metrics.highMatches} forts matchs
                </span>
              )}
            </div>
          </SectionCard>

          {/* PRÉFÉRENCES CARRIÈRE */}
          <SectionCard title="Préférences carrière">
            <Row label="Rôles visés">
              <span className="text-sm">{prefs?.desiredRoles?.join(' · ') || '—'}</span>
            </Row>
            <Row label="Localisations">
              <span className="text-sm">{prefs?.locations?.join(' · ') || '—'}</span>
            </Row>
            <Row label="Rayon de recherche">
              <span className="text-sm">{prefs?.searchRadiusKm != null ? `${prefs.searchRadiusKm} km` : '—'}</span>
            </Row>
            <Row label="Télétravail">
              <Segment
                value={(prefs?.remote ?? 'remote') as 'onsite' | 'hybrid' | 'remote'}
                onChange={(v) => savePrefs.mutate({ remote: v })}
                options={[{ value: 'onsite', label: 'Sur site' }, { value: 'hybrid', label: 'Hybride' }, { value: 'remote', label: 'Remote' }]}
              />
            </Row>
            <Row label="TJM" divide={false}>
              <span className="text-sm">{prefs?.tjmMin && prefs?.tjmMax ? `${prefs.tjmMin} – ${prefs.tjmMax} €` : '—'}</span>
            </Row>
            <div className="mt-3">
              <button onClick={() => setEditPrefs((o) => !o)} className="btn-secondary">
                {editPrefs ? 'Fermer' : 'Modifier les préférences'}
              </button>
            </div>
            {editPrefs && <div className="mt-4"><PreferencesForm /></div>}
          </SectionCard>
        </div>

        {/* Colonne droite */}
        <div className="flex flex-col gap-5">
          {/* AUTO-CANDIDATURE */}
          <SectionCard title="Auto-candidature">
            <Row label="Envoi automatique" sub="Désactivé : chaque dossier attend votre validation (recommandé)">
              <Toggle
                checked={auto?.autoApplyEnabled ?? false}
                onChange={(v) => (v ? setConfirmAuto(true) : saveAuto.mutate({ autoApplyEnabled: false }))}
              />
            </Row>
            <Row label="Seuil de matching" sub="En-dessous du seuil, le dossier reste « à valider »">
              <NumberField value={auto?.autoApplyThreshold ?? 85} min={50} max={100} suffix="%" onCommit={(v) => saveAuto.mutate({ autoApplyThreshold: v })} />
            </Row>
            <Row label="Limite quotidienne">
              <NumberField value={auto?.autoApplyDailyLimit ?? 3} min={1} max={20} onCommit={(v) => saveAuto.mutate({ autoApplyDailyLimit: v })} />
            </Row>
            <Row label="Canal" divide={false}>
              <Segment
                value={(auto?.autoApplyChannel ?? 'manual') as 'manual' | 'email' | 'external_url'}
                onChange={(v) => saveAuto.mutate({ autoApplyChannel: v })}
                options={[{ value: 'manual', label: 'Manuel' }, { value: 'email', label: 'Email' }, { value: 'external_url', label: 'Lien externe' }]}
              />
            </Row>
          </SectionCard>

          {/* NOTIFICATIONS */}
          <SectionCard title="Notifications">
            <Row label="Forts matchs (≥ 80 %)">
              <Toggle checked={notif.high} onChange={(v) => setNotif({ ...notif, high: v })} />
            </Row>
            <Row label="Tendances marché">
              <Toggle checked={notif.market} onChange={(v) => setNotif({ ...notif, market: v })} />
            </Row>
            <Row label="Rapports disponibles">
              <Toggle checked={notif.reports} onChange={(v) => setNotif({ ...notif, reports: v })} />
            </Row>
            <Row label="Toasts dans l’app" sub="Silencieux par défaut — tout arrive dans le panneau" divide={false}>
              <Toggle checked={notif.toasts} onChange={(v) => setNotif({ ...notif, toasts: v })} />
            </Row>
          </SectionCard>

          {/* COMPTE & DONNÉES */}
          <SectionCard title="Compte & données">
            <Row label="Email">
              <span className="text-sm text-brand">{profile?.email ?? '—'}</span>
            </Row>
            <Row label="Langue · fuseau" sub="Europe/Paris">
              <Segment value={lang} onChange={setLang} options={[{ value: 'fr', label: 'Français' }, { value: 'en', label: 'English' }]} />
            </Row>
            <Row label="Thème">
              <Segment value={theme} onChange={chooseTheme} options={[{ value: 'dark', label: 'Sombre' }, { value: 'light', label: 'Clair' }, { value: 'auto', label: 'Auto' }]} />
            </Row>
            <Row label="Export RGPD" sub="Archive JSON complète : profil, préférences, expériences, compétences, candidatures">
              <button onClick={exportData} className="btn-secondary">Exporter mes données</button>
            </Row>
            <button onClick={() => setConfirmDelete(true)} className="mt-3 self-start text-xs text-muted hover:text-rose-400">
              Supprimer mon compte…
            </button>
          </SectionCard>
        </div>
      </div>

      <ConfirmDialog
        open={confirmAuto}
        title="Activer l’envoi automatique ?"
        message="L’agent enverra les candidatures au-dessus du seuil, dans la limite quotidienne, sous votre nom. Les autres restent à valider."
        confirmLabel="Activer"
        onConfirm={() => { saveAuto.mutate({ autoApplyEnabled: true }); setConfirmAuto(false); }}
        onCancel={() => setConfirmAuto(false)}
      />
      <ConfirmDialog
        open={confirmDelete}
        title="Supprimer mon compte ?"
        message="Cette action supprimera définitivement ton profil et tes données. La suppression en libre-service n’est pas encore disponible — contacte-nous pour la déclencher."
        confirmLabel="J’ai compris"
        tone="danger"
        onConfirm={() => setConfirmDelete(false)}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
