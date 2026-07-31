'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { endpoints, Application } from '@/lib/api-client';
import { AutoApplyForm } from '@/components/settings/AutoApplyForm';

const statusStyle: Record<string, string> = {
  pending_review: 'bg-amber-100 text-amber-800',
  approved: 'bg-sky-100 text-sky-800',
  submitted: 'bg-emerald-100 text-emerald-700',
  skipped: 'bg-slate-100 text-slate-500',
  failed: 'bg-rose-100 text-rose-700',
  draft: 'bg-slate-100 text-slate-500',
  rejected: 'bg-rose-100 text-rose-700',
};

function Card({ app }: { app: Application }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const approve = useMutation({
    mutationFn: () => endpoints.approveApplication(app.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] }),
  });
  const skip = useMutation({
    mutationFn: () => endpoints.skipApplication(app.id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['applications'] }),
  });

  return (
    <div className="rounded-xl border bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="font-medium">{app.jobOffer?.title}</div>
          <div className="text-sm text-slate-500">
            {app.jobOffer?.company} · matching {app.matchScore ?? '—'}% · {app.channel}
          </div>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-medium ${statusStyle[app.status]}`}>
          {app.status}
        </span>
      </div>

      {app.notes && <p className="mt-2 text-xs text-slate-500">{app.notes}</p>}

      <div className="mt-3 flex gap-2">
        <button onClick={() => setOpen(!open)} className="text-sm text-brand hover:underline">
          {open ? 'Masquer' : 'Voir le dossier'}
        </button>
        {(app.status === 'pending_review' || app.status === 'approved') && (
          <>
            <button
              onClick={() => approve.mutate()}
              disabled={approve.isPending}
              className="rounded-lg bg-brand px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
            >
              Approuver & envoyer
            </button>
            <button
              onClick={() => skip.mutate()}
              className="rounded-lg border px-3 py-1 text-sm text-slate-600"
            >
              Ignorer
            </button>
          </>
        )}
      </div>

      {open && (
        <div className="mt-3 space-y-2 border-t pt-3 text-sm">
          <div>
            <div className="font-medium text-slate-600">Accroche CV</div>
            <p className="whitespace-pre-line rounded bg-slate-50 p-2">{app.cvSummary}</p>
          </div>
          <div>
            <div className="font-medium text-slate-600">Lettre</div>
            <p className="whitespace-pre-line rounded bg-slate-50 p-2">{app.coverLetter}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ApplicationsPage() {
  const { data: apps = [], isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: endpoints.applications,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Candidatures</h1>
        <p className="text-sm text-slate-500">
          Dossiers préparés par l’agent — relis, approuve ou ignore.
        </p>
      </header>

      <AutoApplyForm />

      {isLoading ? (
        <p className="text-sm text-slate-400">Chargement…</p>
      ) : apps.length === 0 ? (
        <p className="text-sm text-slate-400">
          Aucune candidature. Lance un cycle du Career Agent pour en préparer.
        </p>
      ) : (
        <div className="space-y-3">
          {apps.map((a) => (
            <Card key={a.id} app={a} />
          ))}
        </div>
      )}
    </div>
  );
}
