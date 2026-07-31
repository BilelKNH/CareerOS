import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AgentTrigger } from '@prisma/client';
import { CareerAgentService } from './career-agent.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@UseGuards(JwtAuthGuard)
@Controller('agent')
export class CareerAgentController {
  constructor(
    private readonly agent: CareerAgentService,
    private readonly prisma: PrismaService,
  ) {}

  /** Trigger a full autonomous cycle now. */
  @Post('run')
  run(@CurrentUser('userId') userId: string) {
    return this.agent.runCycle(userId, AgentTrigger.manual);
  }

  @Get('digest')
  digest(@CurrentUser('userId') userId: string) {
    return this.agent.latestDigest(userId);
  }

  @Get('runs')
  runs(@CurrentUser('userId') userId: string) {
    return this.agent.listRuns(userId);
  }

  @Get('runs/:id')
  getRun(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.agent.getRun(userId, id);
  }

  @Get('settings')
  getSettings(@CurrentUser('userId') userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { autonomousAgentEnabled: true },
    });
  }

  /** Enable/disable the autonomous scheduled agent for this user. */
  @Post('settings')
  setEnabled(@CurrentUser('userId') userId: string, @Body('enabled') enabled: boolean) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { autonomousAgentEnabled: enabled },
      select: { autonomousAgentEnabled: true },
    });
  }
}
