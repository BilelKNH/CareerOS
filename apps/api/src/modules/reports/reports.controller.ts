import { BadRequestException, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ReportType } from '@prisma/client';
import { ReportsService } from './reports.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}

  @Get()
  list(@CurrentUser('userId') userId: string) {
    return this.reports.list(userId);
  }

  @Get(':id')
  get(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.reports.get(userId, id);
  }

  @Post('generate')
  generate(@CurrentUser('userId') userId: string, @Query('type') type: string) {
    if (type !== 'weekly' && type !== 'monthly') {
      throw new BadRequestException('type must be "weekly" or "monthly"');
    }
    return this.reports.generate(userId, type as ReportType);
  }
}
