// Shared colour helpers layered on top of the Nocturne tokens.

/** Score band → semantic pill class + stroke colour (≥80 green, ≥50 amber, else red). */
export function scoreBand(score?: number | null): {
  tag: 'tag-ok' | 'tag-warn' | 'tag-bad' | 'tag-neutral';
  stroke: string;
} {
  if (score == null) return { tag: 'tag-neutral', stroke: 'rgb(var(--muted))' };
  if (score >= 80) return { tag: 'tag-ok', stroke: 'rgb(var(--ok))' };
  if (score >= 50) return { tag: 'tag-warn', stroke: 'rgb(var(--warn))' };
  return { tag: 'tag-bad', stroke: 'rgb(var(--bad))' };
}

// Category palette — mid-ramp hues that read on the dark ground.
const CATEGORY_PALETTE = [
  '#9184d9', // blurple (accent)
  '#1d9e75', // teal
  '#d85a30', // coral
  '#378add', // blue
  '#ba7517', // amber
  '#d4537e', // pink
  '#639922', // green
  '#8a86b8', // muted violet
];

/** Deterministic colour for a category/sector name. */
export function categoryColor(key: string): string {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) >>> 0;
  return CATEGORY_PALETTE[h % CATEGORY_PALETTE.length];
}
