import { CareerAgentService } from './career-agent.service';
import { makePrisma } from '../../test-utils/prisma.mock';

function build() {
  const prisma = makePrisma();
  prisma.agentRun.create.mockResolvedValue({ id: 'run1' });
  prisma.user.findUniqueOrThrow.mockResolvedValue({ employabilityScore: 70 });
  prisma.jobMatch.findMany.mockResolvedValue([]);
  prisma.agentRun.update.mockImplementation((a: { data: unknown }) => Promise.resolve({ id: 'run1', ...(a.data as object) }));

  const deps = {
    scraping: { run: jest.fn().mockResolvedValue([]) },
    matching: { matchAllForUser: jest.fn().mockResolvedValue([]) },
    market: { analyze: jest.fn().mockResolvedValue({ skillCoverage: 50, missingInDemand: [], topTechnologies: [{ name: 'Playwright' }] }) },
    coach: { plan: jest.fn().mockResolvedValue({ focusSkills: ['AWS'], summary: 's' }) },
    cv: { adapt: jest.fn() },
    llm: { available: false },
    notifications: { notifyHighMatches: jest.fn().mockResolvedValue([]) },
    users: { recomputeEmployabilityScore: jest.fn().mockResolvedValue(72) },
    memory: { addMemory: jest.fn(), createSnapshot: jest.fn() },
    applications: { autoApplyForUser: jest.fn().mockResolvedValue({ prepared: 0, submitted: 0, pendingReview: 0, skippedByLimit: 0 }) },
  };
  const svc = new CareerAgentService(
    prisma, deps.scraping as never, deps.matching as never, deps.market as never, deps.coach as never,
    deps.cv as never, deps.llm as never, deps.notifications as never, deps.users as never,
    deps.memory as never, deps.applications as never,
  );
  return { prisma, deps, svc };
}

describe('CareerAgentService.runCycle', () => {
  it('runs a full cycle and stores a completed run with a digest', async () => {
    const { svc, deps } = build();
    const run = (await svc.runCycle('u1', 'manual' as never)) as unknown as {
      status: string;
      digest: { scoreDelta: number; method: string };
    };

    expect(deps.scraping.run).toHaveBeenCalledWith('u1');
    expect(deps.matching.matchAllForUser).toHaveBeenCalled();
    expect(deps.applications.autoApplyForUser).toHaveBeenCalled();
    expect(run.status).toBe('completed');
    expect(run.digest.scoreDelta).toBe(2); // 72 - 70
    expect(run.digest.method).toBe('rules');
  });

  it('marks the run failed on error', async () => {
    const { svc, deps, prisma } = build();
    deps.scraping.run.mockRejectedValue(new Error('boom'));
    const run = (await svc.runCycle('u1', 'scheduled' as never)) as unknown as { status: string };
    expect(run.status).toBe('failed');
    expect(prisma.agentRun.update).toHaveBeenCalled();
  });
});

describe('CareerAgentService queries', () => {
  it('lists runs and reads the latest digest', async () => {
    const { svc, prisma } = build();
    prisma.agentRun.findMany.mockResolvedValue([{ id: 'run1' }]);
    prisma.agentRun.findFirst.mockResolvedValue({ id: 'run1' });
    expect(await svc.listRuns('u1')).toHaveLength(1);
    expect(await svc.latestDigest('u1')).toMatchObject({ id: 'run1' });
  });
});
