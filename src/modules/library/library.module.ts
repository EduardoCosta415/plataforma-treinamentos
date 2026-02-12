import { Module } from '@nestjs/common';
import { LibraryController } from './library.controller';
import { StudentLibraryController } from './library.student.controller';
import { LibraryService } from './library.service';

@Module({
  controllers: [LibraryController, StudentLibraryController],
  providers: [LibraryService],
})
export class LibraryModule {}
