import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { AutoApplySettingsDto } from './dto/auto-apply-settings.dto';

@UseGuards(JwtAuthGuard)
@Controller('applications')
export class ApplicationsController {
  constructor(
    private readonly applications: ApplicationsService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  list(@CurrentUser('userId') userId: string) {
    return this.applications.list(userId);
  }

  @Get('settings')
  getSettings(@CurrentUser('userId') userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        autoApplyEnabled: true,
        autoApplyThreshold: true,
        autoApplyDailyLimit: true,
        autoApplyChannel: true,
      },
    });
  }

  @Post('settings')
  updateSettings(@CurrentUser('userId') userId: string, @Body() dto: AutoApplySettingsDto) {
    return this.prisma.user.update({
      where: { id: userId },
      data: dto as never,
      select: {
        autoApplyEnabled: true,
        autoApplyThreshold: true,
        autoApplyDailyLimit: true,
        autoApplyChannel: true,
      },
    });
  }

  @Get(':id')
  get(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.applications.get(userId, id);
  }

  /** Prepare a package for an offer (no submission). */
  @Post('prepare')
  prepare(@CurrentUser('userId') userId: string, @Body('offerId') offerId: string) {
    return this.applications.prepare(userId, offerId);
  }

  /** Approve → submit via the configured channel. */
  @Post(':id/approve')
  approve(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.applications.approve(userId, id);
  }

  @Post(':id/skip')
  skip(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.applications.skip(userId, id);
  }

  @Post(':id/reject')
  reject(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.applications.reject(userId, id);
  }

  @Post(':id/followup')
  followUp(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.applications.markFollowedUp(userId, id);
  }

  /** Move to the interview stage (optionally with a scheduled date). */
  @Post(':id/interview')
  interview(
    @CurrentUser('userId') userId: string,
    @Param('id') id: string,
    @Body('interviewAt') interviewAt?: string,
  ) {
    return this.applications.setStage(userId, id, 'interview', interviewAt);
  }

  /** Move to the offer/proposition stage. */
  @Post(':id/offer')
  offer(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.applications.setStage(userId, id, 'offer');
  }
}
