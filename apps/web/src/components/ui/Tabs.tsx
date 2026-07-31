'use client';

import { useEffect, useState } from 'react';

export interface TabItem {
  id: string;
  label: string;
  content: React.ReactNode;
}

export function Tabs({ tabs, storageKey }: { tabs: TabItem[]; storageKey?: string }) {
  // Start with the first tab so the server and first client render match.
  const [active, setActive] = useState<string>(tabs[0]?.id);

  // Restore the saved tab after mount (avoids an SSR/localStorage hydration mismatch).
  useEffect(() => {
    if (!storageKey) return;
    const saved = localStorage.getItem(`tabs_${storageKey}`);
    if (saved && tabs.some((t) => t.id === saved)) setActive(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey]);

  function select(id: string) {
    setActive(id);
    if (storageKey && typeof window !== 'undefined') localStorage.setItem(`tabs_${storageKey}`, id);
  }

  return (
    <div>
      <div className="mb-5 flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => select(t.id)}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition ${
              active === t.id
                ? 'border-brand text-brand'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tabs.find((t) => t.id === active)?.content}
    </div>
  );
}
