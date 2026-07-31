import { CvImportService } from './cv-import.service';
import { makePrisma } from '../../test-utils/prisma.mock';

const extraction = {
  skills: [{ name: 'Playwright', category: 'framework', inferred: false }],
  technologies: ['Playwright'],
  responsibilities: [],
  results: [],
  summary: 'QA engineer',
  method: 'heuristic',
};

describe('CvImportService', () => {
  it('parses a text CV, fuses skills and scores it', async () => {
    const prisma = makePrisma();
    prisma.careerJournal.create.mockResolvedValue({});
    prisma.user.update.mockResolvedValue({});
    const memoryAgent = { extract: jest.fn().mockResolvedValue(extraction) };
    const experienceExtractor = {
      extract: jest.fn().mockResolvedValue([
        { title: 'QA', company: 'Acme', startDate: new Date('2021-01-01'), endDate: null, isCurrent: true, description: '', technologies: ['Playwright'] },
      ]),
    };
    const skills = { upsert: jest.fn().mockResolvedValue({}) };
    const experiences = { recomputeYearsExperience: jest.fn().mockResolvedValue(3) };
    const users = { recomputeEmployabilityScore: jest.fn().mockResolvedValue(60) };
    const memory = { addMemory: jest.fn(), createSnapshot: jest.fn() };
    prisma.experience.findMany.mockResolvedValue([]);
    prisma.experience.create.mockResolvedValue({});
    const svc = new CvImportService(
      prisma, memoryAgent as never, experienceExtractor as never, skills as never,
      experiences as never, users as never, memory as never,
    );

    const file = {
      originalname: 'cv.txt',
      mimetype: 'text/plain',
      buffer: Buffer.from(
        'Playwright TypeScript CI/CD — contact bilel@test.com, 2020-2023, mis en place un pipeline, réduit de 40% le temps.',
      ),
    };
    const res = await svc.importCv('u1', file);

    expect(res.fileName).toBe('cv.txt');
    expect(res.employabilityScore).toBe(60);
    expect(res.cvScore.global).toBeGreaterThan(0);
    expect(skills.upsert).toHaveBeenCalled();
    expect(res.experiencesFound).toBe(1);
    expect(res.experiencesAdded).toBe(1);
    expect(prisma.experience.create).toHaveBeenCalledTimes(1);
  });

  it('does not re-create an experience already on the profile', async () => {
    const prisma = makePrisma();
    prisma.careerJournal.create.mockResolvedValue({});
    prisma.user.update.mockResolvedValue({});
    const memoryAgent = { extract: jest.fn().mockResolvedValue(extraction) };
    const experienceExtractor = {
      extract: jest.fn().mockResolvedValue([
        { title: 'QA', company: '', startDate: new Date('2021-01-01'), endDate: null, isCurrent: true, description: '', technologies: [] },
      ]),
    };
    const skills = { upsert: jest.fn().mockResolvedValue({}) };
    const experiences = { recomputeYearsExperience: jest.fn().mockResolvedValue(3) };
    const users = { recomputeEmployabilityScore: jest.fn().mockResolvedValue(60) };
    const memory = { addMemory: jest.fn(), createSnapshot: jest.fn() };
    // Stored with the "N/A" placeholder — must still match the empty-company extraction.
    prisma.experience.findMany.mockResolvedValue([{ title: 'QA', company: 'N/A' }]);
    prisma.experience.create.mockResolvedValue({});
    const svc = new CvImportService(
      prisma, memoryAgent as never, experienceExtractor as never, skills as never,
      experiences as never, users as never, memory as never,
    );

    const res = await svc.importCv('u1', {
      originalname: 'cv.txt',
      mimetype: 'text/plain',
      buffer: Buffer.from('Playwright 2020-2023 mis en place un pipeline pour QA.'),
    });

    expect(res.experiencesFound).toBe(1);
    expect(res.experiencesAdded).toBe(0);
    expect(prisma.experience.create).not.toHaveBeenCalled();
  });

  it('rejects an unreadable CV', async () => {
    const svc = new CvImportService(
      makePrisma(), { extract: jest.fn() } as never, { extract: jest.fn() } as never,
      {} as never, {} as never, {} as never, {} as never,
    );
    await expect(
      svc.importCv('u1', { originalname: 'x.txt', mimetype: 'text/plain', buffer: Buffer.from('') }),
    ).rejects.toThrow();
  });
});
