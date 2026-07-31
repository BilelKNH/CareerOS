import { ScrapingService } from './scraping.service';
import { makePrisma, makeConfig } from '../../test-utils/prisma.mock';

describe('ScrapingService', () => {
  it('lists the registered sources (sample active when no API keys)', () => {
    const svc = new ScrapingService(makePrisma(), makeConfig({}));
    const sources = svc.listSources();
    const sample = sources.find((s) => s.source === 'sample');
    expect(sample?.enabled).toBe(true);
  });

  it('inserts new offers and dedups by content hash', async () => {
    const prisma = makePrisma();
    prisma.jobOffer.findUnique.mockResolvedValue(null); // nothing exists yet
    prisma.jobOffer.create.mockImplementation((args: { data: unknown }) => Promise.resolve(args.data));
    const svc = new ScrapingService(prisma, makeConfig({}));

    const inserted = await svc.run();
    expect(inserted.length).toBeGreaterThan(0);
    expect(prisma.jobOffer.create).toHaveBeenCalledTimes(inserted.length);
  });

  it('skips offers already present (dedup)', async () => {
    const prisma = makePrisma();
    prisma.jobOffer.findUnique.mockResolvedValue({ id: 'existing' }); // all already exist
    const svc = new ScrapingService(prisma, makeConfig({}));

    const inserted = await svc.run();
    expect(inserted).toHaveLength(0);
    expect(prisma.jobOffer.create).not.toHaveBeenCalled();
  });
});
