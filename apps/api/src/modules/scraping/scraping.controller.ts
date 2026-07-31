import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ScrapingService } from './scraping.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('scraping')
export class ScrapingController {
  constructor(private readonly scraping: ScrapingService) {}

  @Get('sources')
  sources() {
    return this.scraping.listSources();
  }

  @Post('run')
  run(@CurrentUser('userId') userId: string) {
    return this.scraping.run(userId);
  }
}
