'use client';

import { AgentControl } from '@/components/settings/AgentControl';
import { PreferencesForm } from '@/components/settings/PreferencesForm';
import { AutoApplyForm } from '@/components/settings/AutoApplyForm';
import { SourcesPanel } from '@/components/settings/SourcesPanel';

export default function SettingsPage() {
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
        <div className="flex flex-col gap-5">
          <AgentControl />
          <PreferencesForm />
        </div>
        <div className="flex flex-col gap-5">
          <AutoApplyForm />
          <SourcesPanel />
        </div>
      </div>
    </div>
  );
}
