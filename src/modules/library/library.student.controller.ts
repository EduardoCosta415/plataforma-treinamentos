import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { LibraryService } from './library.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@UseGuards(AuthGuard('jwt'))
@Controller('library')
export class StudentLibraryController {
  constructor(private readonly library: LibraryService) {}

  @Get('me')
  myLibrary(@CurrentUser('sub') studentId: string) {
    return this.library.listMyLibrary(studentId);
  }

  @Get('me/course/:courseId')
  myLibraryByCourse(
    @CurrentUser('sub') studentId: string,
    @Param('courseId') courseId: string,
  ) {
    return this.library.listMyLibraryByCourse(studentId, courseId);
  }
}
