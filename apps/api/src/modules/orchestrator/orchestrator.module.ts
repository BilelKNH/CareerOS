import { Module } from '@nestjs/common';
import { CareerAgentService } from './career-agent.service';
import { CareerAgentController } from './career-agent.controller';
import { ScrapingModule } from '../scraping/scraping.module';
import { JobSearchModule } from '../job-search/job-search.module';
import { AiAnalysisModule } from '../ai-analysis/ai-analysis.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UserModule } from '../user/user.module';
import { CareerMemoryModule } from '../career-memory/career-memory.module';
import { ApplicationsModule } from '../applications/applications.module';

@Module({
  imports: [
    ScrapingModule,
    JobSearchModule,
    AiAnalysisModule,
    NotificationsModule,
    UserModule,
    CareerMemoryModule,
    ApplicationsModule,
  ],
  providers: [CareerAgentService],
  controllers: [CareerAgentController],
  exports: [CareerAgentService],
})
export class OrchestratorModule {}
