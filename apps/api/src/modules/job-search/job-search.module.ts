import { Module } from '@nestjs/common';
import { JobSearchService } from './job-search.service';
import { MatchingService } from './matching.service';
import { JobSearchController } from './job-search.controller';

@Module({
  providers: [JobSearchService, MatchingService],
  controllers: [JobSearchController],
  exports: [MatchingService],
})
export class JobSearchModule {}
