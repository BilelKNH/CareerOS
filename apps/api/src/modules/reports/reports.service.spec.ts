import { ReportsService } from './reports.service';
import { makePrisma } from '../../test-utils/prisma.mock';

const market = {
  analyze: jest.fn().mockResolvedValue({
    topRequiredSkills: [], topTechnologies: [], salary: null, tjm: null,
    skillCoverage: 50, commentary: null, missingInDemand: [],
  }),
};
const coach = {
  plan: jest.fn().mockResolvedValue({
    focusSkills: ['AWS'], summary: 's', certifications: [], projectIdeas: [], interviewPrep: [], method: 'rules',
  }),
};
const notifications = { create: jest.fn().mockResolvedValue({}) };

describe('ReportsService', () => {
  it('generates a weekly report and notifies', async () => {
    const prisma = makePrisma();
    prisma.jobOffer.count.mockResolvedValue(5);
    prisma.jobMatch.findMany.mockResolvedValue([]);
    prisma.report.create.mockResolvedValue({ id: 'r1', type: 'weekly' });
    const svc = new ReportsService(prisma, market as never, coach as never, notifications as never);

    const report = await svc.generate('u1', 'weekly' as never);
    expect(report).toMatchObject({ id: 'r1' });
    expect(notifications.create).toHaveBeenCalled();
  });

  it('generates a monthly report', async () => {
    const prisma = makePrisma();
    prisma.memorySnapshot.count.mockResolvedValue(1);
    prisma.skill.findMany.mockResolvedValue([]);
    prisma.skill.count.mockResolvedValue(5);
    prisma.report.create.mockResolvedValue({ id: 'r2', type: 'monthly' });
    const svc = new ReportsService(prisma, market as never, coach as never, notifications as never);

    const report = await svc.generate('u1', 'monthly' as never);
    expect(report).toMatchObject({ id: 'r2' });
  });

  it('lists and fetches reports', async () => {
    const prisma = makePrisma();
    prisma.report.findMany.mockResolvedValue([{ id: 'r1' }]);
    prisma.report.findFirst.mockResolvedValue({ id: 'r1' });
    const svc = new ReportsService(prisma, market as never, coach as never, notifications as never);
    expect(await svc.list('u1')).toHaveLength(1);
    expect(await svc.get('u1', 'r1')).toMatchObject({ id: 'r1' });
  });
});
