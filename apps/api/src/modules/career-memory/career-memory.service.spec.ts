import { CareerMemoryService } from './career-memory.service';
import { EmbeddingService } from './embedding.service';
import { makePrisma } from '../../test-utils/prisma.mock';

function embeddingMock(vec: number[] | null) {
  return {
    embed: jest.fn().mockResolvedValue(vec),
    toVectorLiteral: (v: number[]) => `[${v.join(',')}]`,
  } as unknown as EmbeddingService;
}

describe('CareerMemoryService', () => {
  it('stores a memory with an embedding', async () => {
    const prisma = makePrisma();
    prisma.$executeRaw.mockResolvedValue(1);
    const svc = new CareerMemoryService(prisma, embeddingMock([0.1, 0.2]));
    const res = await svc.addMemory('u1', 'achievement' as never, 'content');
    expect(res).toEqual({ stored: true, embedded: true });
    expect(prisma.$executeRaw).toHaveBeenCalled();
  });

  it('stores a memory without an embedding when none is produced', async () => {
    const prisma = makePrisma();
    prisma.$executeRaw.mockResolvedValue(1);
    const svc = new CareerMemoryService(prisma, embeddingMock(null));
    const res = await svc.addMemory('u1', 'skill' as never, 'content');
    expect(res.embedded).toBe(false);
  });

  it('falls back to recent memories when no query embedding', async () => {
    const prisma = makePrisma();
    prisma.careerMemory.findMany.mockResolvedValue([{ id: 'm1', kind: 'skill', content: 'x' }]);
    const svc = new CareerMemoryService(prisma, embeddingMock(null));
    const hits = await svc.query('u1', 'q');
    expect(hits[0]).toMatchObject({ id: 'm1', distance: 0 });
  });

  it('creates a versioned snapshot', async () => {
    const prisma = makePrisma();
    prisma.user.findUniqueOrThrow.mockResolvedValue({ id: 'u1', skills: [] });
    prisma.memorySnapshot.findFirst.mockResolvedValue(null);
    prisma.memorySnapshot.create.mockImplementation((a: { data: unknown }) => Promise.resolve(a.data));
    const svc = new CareerMemoryService(prisma, embeddingMock(null));
    const snap = (await svc.createSnapshot('u1', 'reason', 'manual' as never)) as { version: number };
    expect(snap.version).toBe(1);
  });

  it('lists snapshots', async () => {
    const prisma = makePrisma();
    prisma.memorySnapshot.findMany.mockResolvedValue([{ version: 1 }]);
    const svc = new CareerMemoryService(prisma, embeddingMock(null));
    expect(await svc.listSnapshots('u1')).toHaveLength(1);
  });
});
