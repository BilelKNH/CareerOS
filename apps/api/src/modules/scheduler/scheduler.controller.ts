import { Controller, Post, UseGuards } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly scheduler: SchedulerService) {}

  /** Manually trigger the scrape → match → notify pipeline for the current user. */
  @Post('run')
  run(@CurrentUser('userId') userId: string) {
    return this.scheduler.runForUser(userId);
  }
}
