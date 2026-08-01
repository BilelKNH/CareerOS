'use client';

import { useEffect, useState } from 'react';

export function SectionCard({
  title,
  badge,
  children,
}: {
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center gap-2">
        <h6 className="text-muted">{title}</h6>
        {badge}
      </div>
      <div className="flex flex-col">{children}</div>
    </section>
  );
}

export function Row({
  label,
  sub,
  children,
  divide = true,
}: {
  label: string;
  sub?: string;
  children?: React.ReactNode;
  divide?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-4 py-3 ${divide ? 'border-b border-border/50 last:border-0' : ''}`}>
      <div className="min-w-0">
        <div className="text-sm">{label}</div>
        {sub && <div className="mt-0.5 text-xs text-muted">{sub}</div>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="relative h-5 w-9 rounded-full transition"
      style={{ background: checked ? 'rgb(var(--brand))' : 'rgb(var(--border))' }}
    >
      <span
        className="absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all"
        style={{ left: checked ? '18px' : '2px' }}
      />
    </button>
  );
}

export function Segment<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex overflow-hidden rounded-lg border border-border text-xs">
      {options.map((o, i) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 font-medium transition ${i > 0 ? 'border-l border-border' : ''} ${
            value === o.value ? 'text-brand' : 'text-muted hover:text-foreground'
          }`}
          style={value === o.value ? { boxShadow: 'inset 0 0 0 1px rgb(var(--brand))' } : undefined}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function NumberField({
  value,
  onCommit,
  min,
  max,
  suffix,
}: {
  value: number;
  onCommit: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  return (
    <span className="inline-flex items-center gap-1">
      <input
        type="number"
        value={v}
        min={min}
        max={max}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => onCommit(Math.max(min ?? -Infinity, Math.min(max ?? Infinity, Number(v) || 0)))}
        className="input h-8 w-20 text-right text-[13px]"
      />
      {suffix && <span className="text-xs text-muted">{suffix}</span>}
    </span>
  );
}

/** Local-only setting persisted to localStorage (for UI prefs without a backend). */
export function useLocal<T>(key: string, def: T): [T, (v: T) => void] {
  const [v, setV] = useState<T>(def);
  useEffect(() => {
    try {
      const s = localStorage.getItem(key);
      if (s != null) setV(JSON.parse(s) as T);
    } catch {
      /* ignore */
    }
  }, [key]);
  const set = (nv: T) => {
    setV(nv);
    try {
      localStorage.setItem(key, JSON.stringify(nv));
    } catch {
      /* ignore */
    }
  };
  return [v, set];
}
