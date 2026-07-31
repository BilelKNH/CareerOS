import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CvAgentService } from './cv-agent.service';
import { MarketAgentService } from './market-agent.service';
import { CoachAgentService } from './coach-agent.service';

@UseGuards(JwtAuthGuard)
@Controller('ai')
export class AiAnalysisController {
  constructor(
    private readonly cv: CvAgentService,
    private readonly market: MarketAgentService,
    private readonly coach: CoachAgentService,
  ) {}

  @Post('adapt-cv')
  adaptCv(@CurrentUser('userId') userId: string, @Body('offerId') offerId?: string) {
    return this.cv.adapt(userId, offerId);
  }

  @Get('market')
  marketAnalysis(@CurrentUser('userId') userId: string) {
    return this.market.analyze(userId);
  }

  @Get('coach')
  coachPlan(@CurrentUser('userId') userId: string) {
    return this.coach.plan(userId);
  }
}
