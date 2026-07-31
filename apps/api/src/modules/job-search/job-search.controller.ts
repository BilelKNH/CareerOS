import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JobSearchService } from './job-search.service';
import { MatchingService } from './matching.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller()
export class JobSearchController {
  constructor(
    private readonly jobs: JobSearchService,
    private readonly matching: MatchingService,
  ) {}

  @Get('jobs')
  listJobs(@CurrentUser('userId') userId: string, @Query('source') source?: string) {
    return this.jobs.listOffers(userId, source);
  }

  @Get('jobs/:id')
  getJob(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.jobs.getOffer(userId, id);
  }

  @Get('matches')
  listMatches(@CurrentUser('userId') userId: string) {
    return this.jobs.listMatches(userId);
  }

  @Post('matches/recompute')
  recompute(@CurrentUser('userId') userId: string) {
    return this.matching.matchAllForUser(userId);
  }
}
