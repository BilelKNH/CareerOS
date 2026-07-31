import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { SnapshotTrigger } from '@prisma/client';
import { CareerMemoryService } from './career-memory.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('memory')
export class CareerMemoryController {
  constructor(private readonly memory: CareerMemoryService) {}

  @Get('snapshots')
  snapshots(@CurrentUser('userId') userId: string) {
    return this.memory.listSnapshots(userId);
  }

  @Post('snapshots')
  createSnapshot(@CurrentUser('userId') userId: string, @Body('reason') reason: string) {
    return this.memory.createSnapshot(userId, reason ?? 'manual', SnapshotTrigger.manual);
  }

  @Post('query')
  query(@CurrentUser('userId') userId: string, @Body('query') query: string) {
    return this.memory.query(userId, query);
  }

  @Get('context')
  context(@CurrentUser('userId') userId: string, @Query('focus') focus?: string) {
    return this.memory.rebuildContext(userId, focus);
  }
}
