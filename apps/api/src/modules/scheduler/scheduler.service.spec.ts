import { SchedulerService } from './scheduler.service';
import { makePrisma } from '../../test-utils/prisma.mock';

function build() {
  const prisma = makePrisma();
  prisma.user.findMany.mockResolvedValue([{ id: 'u1' }, { id: 'u2' }]);
  const agent = { runCycle: jest.fn().mockResolvedValue({}) };
  const reports = { generate: jest.fn().mockResolvedValue({}) };
  const svc = new SchedulerService(prisma, agent as never, reports as never);
  return { svc, agent, reports };
}

describe('SchedulerService', () => {
  it('runs the daily agent cycle for every enabled user', async () => {
    const { svc, agent } = build();
    await svc.runDaily();
    expect(agent.runCycle).toHaveBeenCalledTimes(2);
  });

  it('generates weekly and monthly reports for all users', async () => {
    const { svc, reports } = build();
    await svc.runWeeklyReports();
    await svc.runMonthlyReports();
    expect(reports.generate).toHaveBeenCalledTimes(4);
  });

  it('runs on demand for one user', async () => {
    const { svc, agent } = build();
    await svc.runForUser('u1');
    expect(agent.runCycle).toHaveBeenCalledWith('u1', 'manual');
  });
});
