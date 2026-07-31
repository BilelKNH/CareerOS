import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { SchedulerController } from './scheduler.controller';
import { OrchestratorModule } from '../orchestrator/orchestrator.module';
import { ReportsModule } from '../reports/reports.module';

@Module({
  imports: [OrchestratorModule, ReportsModule],
  providers: [SchedulerService],
  controllers: [SchedulerController],
})
export class SchedulerModule {}
