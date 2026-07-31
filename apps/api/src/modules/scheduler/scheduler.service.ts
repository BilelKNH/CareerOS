import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgentTrigger, ReportType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CareerAgentService } from '../orchestrator/career-agent.service';
import { ReportsService } from '../reports/reports.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly agent: CareerAgentService,
    private readonly reports: ReportsService,
  ) {}

  /**
   * Daily autonomous run at 06:00: the Career Agent orchestrates the full
   * perceive → reason → act cycle for every user who has it enabled.
   */
  @Cron(CronExpression.EVERY_DAY_AT_6AM)
  async runDaily() {
    const users = await this.prisma.user.findMany({
      where: { autonomousAgentEnabled: true },
      select: { id: true },
    });
    this.logger.log(`Autonomous agent: daily cycle for ${users.length} user(s).`);
    for (const { id } of users) {
      await this.agent.runCycle(id, AgentTrigger.scheduled);
    }
  }

  /** Weekly report — Monday 07:00. */
  @Cron('0 7 * * 1')
  async runWeeklyReports() {
    const users = await this.prisma.user.findMany({ select: { id: true } });
    for (const { id } of users) await this.reports.generate(id, ReportType.weekly);
    this.logger.log(`Weekly reports generated for ${users.length} user(s).`);
  }

  /** Monthly report — 1st of the month, 07:00. */
  @Cron('0 7 1 * *')
  async runMonthlyReports() {
    const users = await this.prisma.user.findMany({ select: { id: true } });
    for (const { id } of users) await this.reports.generate(id, ReportType.monthly);
    this.logger.log(`Monthly reports generated for ${users.length} user(s).`);
  }

  /** On-demand full cycle for one user (kept for the /scheduler/run endpoint). */
  runForUser(userId: string) {
    return this.agent.runCycle(userId, AgentTrigger.manual);
  }
}
