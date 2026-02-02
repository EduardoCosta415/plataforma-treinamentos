import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import * as path from 'path';
import { LibraryService } from './library.service';

@UseGuards(AuthGuard('jwt'))
@Controller('library')
export class LibraryStudentController {
  constructor(private readonly library: LibraryService) {}

  @Get('course/:courseId')
  list(@Param('courseId') courseId: string) {
    return this.library.listByCourse(courseId);
  }

  @Get(':id/download')
  async download(@Param('id') id: string, @Res() res: Response) {
    const item = await this.library.getById(id);

    // fileUrl = /uploads/library/xxxx.pdf
    const filename = item.fileUrl.split('/').pop()!;
    const abs = path.resolve(process.cwd(), 'uploads', 'library', filename);

    return res.sendFile(abs);
  }
}
