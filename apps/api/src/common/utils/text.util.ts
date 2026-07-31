/** Normalize a skill/keyword name for dedup: lowercase, trim, collapse whitespace. */
export function normalizeSkill(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}
