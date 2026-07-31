import { normalizeSkill } from './skills.service';

describe('normalizeSkill', () => {
  it('lowercases and trims', () => {
    expect(normalizeSkill('  Playwright ')).toBe('playwright');
  });

  it('collapses internal whitespace so duplicates converge', () => {
    expect(normalizeSkill('GitHub   Actions')).toBe('github actions');
  });

  it('maps case variants to the same key (dedup)', () => {
    expect(normalizeSkill('TypeScript')).toBe(normalizeSkill('typescript'));
  });
});
