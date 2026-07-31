import { CareerJournalService } from './career-journal.service';
import { makePrisma } from '../../test-utils/prisma.mock';

const extraction = {
  skills: [{ name: 'Playwright', category: 'framework', inferred: false }],
  technologies: ['Playwright'],
  responsibilities: [],
  results: [],
  summary: 's',
  method: 'heuristic',
};
const deps = () => ({
  memoryAgent: { extract: jest.fn().mockResolvedValue(extraction) },
  skills: { upsert: jest.fn().mockResolvedValue({}) },
  users: { recomputeEmployabilityScore: jest.fn().mockResolvedValue(50) },
  memory: { addMemory: jest.fn(), createSnapshot: jest.fn() },
});

describe('CareerJournalService', () => {
  it('previews without applying', async () => {
    const prisma = makePrisma();
    prisma.careerJournal.create.mockResolvedValue({ id: 'j1' });
    const d = deps();
    const svc = new CareerJournalService(prisma, d.memoryAgent as never, d.skills as never, d.users as never, d.memory as never);
    const res = (await svc.create('u1', 'texte', false)) as { preview?: boolean };
    expect(res.preview).toBe(true);
    expect(d.skills.upsert).not.toHaveBeenCalled();
  });

  it('applies the extraction to the profile', async () => {
    const prisma = makePrisma();
    prisma.careerJournal.create.mockResolvedValue({ id: 'j1' });
    prisma.careerJournal.update.mockResolvedValue({});
    const d = deps();
    const svc = new CareerJournalService(prisma, d.memoryAgent as never, d.skills as never, d.users as never, d.memory as never);
    const res = (await svc.create('u1', 'texte', true)) as { employabilityScore?: number };
    expect(d.skills.upsert).toHaveBeenCalled();
    expect(res.employabilityScore).toBe(50);
  });
});
