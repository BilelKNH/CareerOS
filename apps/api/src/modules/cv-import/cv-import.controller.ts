import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CvImportService } from './cv-import.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UploadedCv } from './cv-parser';

@UseGuards(JwtAuthGuard)
@Controller('cv')
export class CvImportController {
  constructor(private readonly cvImport: CvImportService) {}

  @Post('import')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } }))
  import(@CurrentUser('userId') userId: string, @UploadedFile() file: UploadedCv) {
    if (!file) throw new BadRequestException('Fichier manquant (champ "file").');
    return this.cvImport.importCv(userId, file);
  }
}
