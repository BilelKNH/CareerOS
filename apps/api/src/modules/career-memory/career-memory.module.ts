import { Module } from '@nestjs/common';
import { CareerMemoryService } from './career-memory.service';
import { CareerMemoryController } from './career-memory.controller';
import { EmbeddingService } from './embedding.service';

@Module({
  providers: [CareerMemoryService, EmbeddingService],
  controllers: [CareerMemoryController],
  exports: [CareerMemoryService],
})
export class CareerMemoryModule {}
