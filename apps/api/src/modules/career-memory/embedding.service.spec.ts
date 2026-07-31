import { EmbeddingService } from './embedding.service';
import { makeConfig } from '../../test-utils/prisma.mock';

const svc = new EmbeddingService(makeConfig({ EMBEDDING_PROVIDER: 'local' }));

const dot = (a: number[], b: number[]) => a.reduce((s, x, i) => s + x * b[i], 0);

describe('EmbeddingService (local hashing)', () => {
  it('produces a normalized 384-dim vector', async () => {
    const v = (await svc.embed('Playwright TypeScript CI/CD')) as number[];
    expect(v).toHaveLength(384);
    const norm = Math.sqrt(dot(v, v));
    expect(norm).toBeCloseTo(1, 5);
  });

  it('ranks similar texts closer than dissimilar ones (cosine)', async () => {
    const a = (await svc.embed('automatisation des tests avec Playwright et CI/CD')) as number[];
    const similar = (await svc.embed('tests automatisés Playwright CI/CD pipeline')) as number[];
    const different = (await svc.embed('recette de cuisine tarte aux pommes')) as number[];
    expect(dot(a, similar)).toBeGreaterThan(dot(a, different));
  });

  it('formats a pgvector literal', () => {
    expect(svc.toVectorLiteral([0.1, 0.2, 0.3])).toBe('[0.1,0.2,0.3]');
  });
});
