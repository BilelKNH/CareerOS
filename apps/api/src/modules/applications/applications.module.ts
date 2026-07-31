import { Module } from '@nestjs/common';
import { ApplicationsService } from './applications.service';
import { ApplicationsController } from './applications.controller';
import { AiAnalysisModule } from '../ai-analysis/ai-analysis.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AiAnalysisModule, NotificationsModule],
  providers: [ApplicationsService],
  controllers: [ApplicationsController],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
