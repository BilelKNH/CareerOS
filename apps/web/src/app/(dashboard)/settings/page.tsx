'use client';

import { Tabs } from '@/components/ui/Tabs';
import { AgentControl } from '@/components/settings/AgentControl';
import { PreferencesForm } from '@/components/settings/PreferencesForm';
import { AutoApplyForm } from '@/components/settings/AutoApplyForm';
import { SourcesPanel } from '@/components/settings/SourcesPanel';

export default function SettingsPage() {
  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Paramètres</h1>
        <p className="text-sm text-slate-500">Centre de contrôle — agent, candidatures, préférences, sources.</p>
      </header>

      <Tabs
        storageKey="settings"
        tabs={[
          { id: 'agent', label: 'Agent', content: <AgentControl /> },
          { id: 'autoapply', label: 'Auto-candidature', content: <AutoApplyForm /> },
          { id: 'prefs', label: 'Préférences', content: <PreferencesForm /> },
          { id: 'sources', label: 'Sources', content: <SourcesPanel /> },
        ]}
      />
    </div>
  );
}
