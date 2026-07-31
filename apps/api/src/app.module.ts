import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './modules/health/health.module';
import { AuthModule } from './modules/auth/auth.module';
import { UserModule } from './modules/user/user.module';
import { ExperiencesModule } from './modules/experiences/experiences.module';
import { SkillsModule } from './modules/skills/skills.module';
import { CareerMemoryModule } from './modules/career-memory/career-memory.module';
import { CareerJournalModule } from './modules/career-journal/career-journal.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ScrapingModule } from './modules/scraping/scraping.module';
import { JobSearchModule } from './modules/job-search/job-search.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SchedulerModule } from './modules/scheduler/scheduler.module';
import { AiAnalysisModule } from './modules/ai-analysis/ai-analysis.module';
import { ReportsModule } from './modules/reports/reports.module';
import { OrchestratorModule } from './modules/orchestrator/orchestrator.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { CvImportModule } from './modules/cv-import/cv-import.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Le .env est à la racine du monorepo ; en conteneur les variables viennent
      // de l'environnement (fichier absent, ignoré). L'ordre couvre les deux cas.
      envFilePath: ['../../.env', '.env'],
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 120 }]),
    PrismaModule,
    HealthModule,
    AuthModule,
    UserModule,
    ExperiencesModule,
    SkillsModule,
    CareerMemoryModule,
    CareerJournalModule,
    DashboardModule,
    ScrapingModule,
    JobSearchModule,
    NotificationsModule,
    AiAnalysisModule,
    ReportsModule,
    ApplicationsModule,
    CvImportModule,
    OrchestratorModule,
    SchedulerModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
