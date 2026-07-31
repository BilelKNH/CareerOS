import { Module } from '@nestjs/common';
import { CareerJournalService } from './career-journal.service';
import { CareerJournalController } from './career-journal.controller';
import { AiAnalysisModule } from '../ai-analysis/ai-analysis.module';
import { SkillsModule } from '../skills/skills.module';
import { UserModule } from '../user/user.module';
import { CareerMemoryModule } from '../career-memory/career-memory.module';

@Module({
  imports: [AiAnalysisModule, SkillsModule, UserModule, CareerMemoryModule],
  providers: [CareerJournalService],
  controllers: [CareerJournalController],
})
export class CareerJournalModule {}
