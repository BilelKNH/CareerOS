import { Module } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { AiAnalysisModule } from '../ai-analysis/ai-analysis.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [AiAnalysisModule, NotificationsModule],
  providers: [ReportsService],
  controllers: [ReportsController],
  exports: [ReportsService],
})
export class ReportsModule {}
