import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
import { LibraryService } from './library.service';
import { CreateLibraryItemDto } from './dto/create-library-item.dto';
import { libraryMulterOptions } from '../../common/upload/multer-pdf.middleware';

@UseGuards(AuthGuard('jwt'))
@Controller('admin/library')
export class LibraryController {
  constructor(private readonly library: LibraryService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', libraryMulterOptions))
  create(@Body() dto: CreateLibraryItemDto, @UploadedFile() file: Express.Multer.File) {
    return this.library.create(dto, file);
  }

  @Get('course/:courseId')
  list(@Param('courseId') courseId: string) {
    return this.library.listByCourse(courseId);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.library.remove(id);
  }
}
