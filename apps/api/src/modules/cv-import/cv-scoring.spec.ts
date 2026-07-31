import { computeCvScore } from './cv-scoring';
import { ExtractionResult } from '../ai-analysis/extraction.types';

const extraction = (skills: string[]): ExtractionResult => ({
  skills: skills.map((name) => ({ name, category: 'framework', inferred: false })),
  technologies: skills,
  responsibilities: [],
  results: [],
  summary: '',
  method: 'heuristic',
});

describe('computeCvScore', () => {
  it('rewards a complete, quantified CV over a sparse one', () => {
    const rich = `Profil : QA Automation Engineer. Contact : bilel@example.com, +33 6 12 34 56 78.
      Expérience : 2020-2024, mis en place un pipeline CI/CD, automatisé 300 tests, réduit de 40% le temps de régression.
      Compétences : Playwright, TypeScript, AWS. Formation : Master informatique, université de Lille.`;
    const sparse = 'CV. Quelqu un qui cherche du travail.';

    const richScore = computeCvScore(rich, extraction(['Playwright', 'TypeScript', 'AWS']));
    const sparseScore = computeCvScore(sparse, extraction([]));

    expect(richScore.global).toBeGreaterThan(sparseScore.global);
    expect(richScore.criteria).toHaveLength(6);
  });

  it('produces recommendations for weak criteria', () => {
    const res = computeCvScore('texte court sans structure', extraction([]));
    expect(res.recommendations.length).toBeGreaterThan(0);
    expect(res.global).toBeLessThan(60);
  });

  it('weights sum to 1 (score stays 0-100)', () => {
    const res = computeCvScore('email@test.com 2021-2023 Playwright', extraction(['Playwright']));
    expect(res.global).toBeGreaterThanOrEqual(0);
    expect(res.global).toBeLessThanOrEqual(100);
  });
});
