import { Module } from '@nestjs/common';
import { LlmService } from './llm.service';
import { MemoryAgentService } from './memory-agent.service';
import { ProfileContextService } from './profile-context.service';
import { CvAgentService } from './cv-agent.service';
import { MarketAgentService } from './market-agent.service';
import { CoachAgentService } from './coach-agent.service';
import { ExperienceExtractorService } from './experience-extractor.service';
import { AiAnalysisController } from './ai-analysis.controller';

@Module({
  controllers: [AiAnalysisController],
  providers: [
    LlmService,
    MemoryAgentService,
    ProfileContextService,
    CvAgentService,
    MarketAgentService,
    CoachAgentService,
    ExperienceExtractorService,
  ],
  exports: [
    LlmService,
    MemoryAgentService,
    MarketAgentService,
    CoachAgentService,
    CvAgentService,
    ExperienceExtractorService,
  ],
})
export class AiAnalysisModule {}
