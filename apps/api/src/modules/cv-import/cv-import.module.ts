import { Module } from '@nestjs/common';
import { CvImportService } from './cv-import.service';
import { CvImportController } from './cv-import.controller';
import { CvMatchService } from './cv-match.service';
import { MatchController } from './match.controller';
import { AiAnalysisModule } from '../ai-analysis/ai-analysis.module';
import { SkillsModule } from '../skills/skills.module';
import { ExperiencesModule } from '../experiences/experiences.module';
import { UserModule } from '../user/user.module';
import { CareerMemoryModule } from '../career-memory/career-memory.module';

@Module({
  imports: [AiAnalysisModule, SkillsModule, ExperiencesModule, UserModule, CareerMemoryModule],
  providers: [CvImportService, CvMatchService],
  controllers: [CvImportController, MatchController],
})
export class CvImportModule {}
