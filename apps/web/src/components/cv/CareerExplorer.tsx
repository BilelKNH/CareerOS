'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { endpoints, CareerMatch } from '@/lib/api-client';
import { categoryColor } from '@/lib/colors';

function scoreColor(s: number) {
  if (s >= 70) return 'bg-emerald-100 text-emerald-800';
  if (s >= 40) return 'bg-amber-100 text-amber-800';
  return 'bg-slate-100 text-slate-500';
}

export function CareerExplorer() {
  const { data = [], isLoading } = useQuery({ queryKey: ['careers'], queryFn: endpoints.careers });
  const [openSectors, setOpenSectors] = useState<Set<string>>(new Set());
  const [openRole, setOpenRole] = useState<string | null>(null);

  const sectors = useMemo(() => {
    const map = new Map<string, CareerMatch[]>();
    for (const c of data) {
      if (!map.has(c.sector)) map.set(c.sector, []);
      map.get(c.sector)!.push(c);
    }
    const list = [...map.entries()].map(([sector, roles]) => ({
      sector,
      roles: [...roles].sort((a, b) => b.score - a.score),
    }));
    list.sort((a, b) => (b.roles[0]?.score ?? 0) - (a.roles[0]?.score ?? 0));
    return list;
  }, [data]);

  const top = useMemo(() => [...data].sort((a, b) => b.score - a.score).slice(0, 3), [data]);

  // Open the best-matching sector by default.
  useEffect(() => {
    if (sectors.length) setOpenSectors(new Set([sectors[0].sector]));
  }, [sectors]);

  const toggle = (s: string) =>
    setOpenSectors((prev) => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });

  return (
    <section className="card p-6">
      <h2 className="font-medium">Explorateur de métiers (profil)</h2>
      <p className="text-sm text-muted">
        Ton <strong>profil complet</strong> comparé aux métiers, par secteur — pour repérer tes
        meilleures pistes. (Le scoring d’un CV précis s’affiche juste après son import.)
      </p>

      {isLoading ? (
        <p className="mt-3 text-sm text-muted">Analyse…</p>
      ) : (
        <>
          {top.length > 0 && (
            <div className="mt-4">
              <div className="mb-2 text-sm font-medium">Tes meilleures pistes</div>
              <div className="flex flex-wrap gap-2">
                {top.map((c) => (
                  <span
                    key={c.role}
                    className={`rounded-full px-3 py-1 text-sm font-medium ${scoreColor(c.score)}`}
                  >
                    {c.role} · {c.score}%
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 space-y-2">
            {sectors.map(({ sector, roles }) => {
              const open = openSectors.has(sector);
              const best = roles[0]?.score ?? 0;
              return (
                <div key={sector} className="rounded-xl border border-border">
                  <button
                    onClick={() => toggle(sector)}
                    className="flex w-full items-center justify-between p-3"
                  >
                    <span className="flex items-center gap-2 text-sm font-medium">
                      <span className="text-muted">{open ? '▾' : '▸'}</span>
                      <span className="h-2 w-2 rounded-full" style={{ background: categoryColor(sector) }} />
                      {sector}
                      <span className="text-xs font-normal text-muted">· {roles.length} métiers</span>
                    </span>
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${scoreColor(best)}`}>
                      max {best}%
                    </span>
                  </button>

                  {open && (
                    <div className="border-t border-border">
                      {roles.map((c) => (
                        <div key={c.role} className="border-b border-border last:border-0">
                          <button
                            onClick={() => setOpenRole(openRole === c.role ? null : c.role)}
                            className="flex w-full items-center justify-between px-4 py-2 text-sm"
                          >
                            <span>{c.role}</span>
                            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${scoreColor(c.score)}`}>
                              {c.score}%
                            </span>
                          </button>
                          {openRole === c.role && (
                            <div className="grid grid-cols-2 gap-4 px-4 pb-3 text-sm">
                              <div>
                                <div className="mb-1 text-xs font-medium text-emerald-700">Tu as</div>
                                <div className="flex flex-wrap gap-1">
                                  {c.matched.length ? (
                                    c.matched.map((s) => (
                                      <span key={s} className="rounded bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                                        {s}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-muted">—</span>
                                  )}
                                </div>
                              </div>
                              <div>
                                <div className="mb-1 text-xs font-medium text-rose-700">À acquérir</div>
                                <div className="flex flex-wrap gap-1">
                                  {c.missing.length ? (
                                    c.missing.map((s) => (
                                      <span key={s} className="rounded bg-rose-50 px-2 py-0.5 text-xs text-rose-700">
                                        {s}
                                      </span>
                                    ))
                                  ) : (
                                    <span className="text-xs text-muted">Aucune 🎉</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}
