import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { ImportService } from './import.service';

@UseGuards(AuthGuard('jwt')) // só admin
@Controller('import')
export class ImportController {
  constructor(private readonly service: ImportService) {}

  /**
   * POST /import/users
   * multipart/form-data
   * file: CSV
   */
  @Post('users')
  @UseInterceptors(FileInterceptor('file'))
  async importUsers(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Arquivo CSV é obrigatório');
    }

    return this.service.importUsersFromCsv(file);
  }
}
