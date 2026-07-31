export function ScoreCard({
  label,
  value,
  suffix = '',
  hint,
}: {
  label: string;
  value: string | number;
  suffix?: string;
  hint?: string;
}) {
  return (
    <div className="card p-5 transition hover:shadow-md">
      <div className="text-sm text-muted">{label}</div>
      <div className="mt-1 text-3xl font-semibold tracking-tight">
        {value}
        <span className="text-lg text-muted">{suffix}</span>
      </div>
      {hint && <div className="mt-1 text-xs text-muted">{hint}</div>}
    </div>
  );
}
