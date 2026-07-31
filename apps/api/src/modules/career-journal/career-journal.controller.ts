import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CareerJournalService } from './career-journal.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateJournalDto } from './dto/create-journal.dto';

@UseGuards(JwtAuthGuard)
@Controller('journal')
export class CareerJournalController {
  constructor(private readonly journal: CareerJournalService) {}

  @Get()
  list(@CurrentUser('userId') userId: string) {
    return this.journal.list(userId);
  }

  @Post()
  create(@CurrentUser('userId') userId: string, @Body() dto: CreateJournalDto) {
    return this.journal.create(userId, dto.rawText, dto.apply ?? false);
  }

  @Post(':id/apply')
  apply(@CurrentUser('userId') userId: string, @Param('id') id: string) {
    return this.journal.apply(userId, id);
  }
}
