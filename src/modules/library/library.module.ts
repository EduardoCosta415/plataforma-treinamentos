import { Module } from '@nestjs/common';
import { LibraryService } from './library.service';
import { LibraryController } from './library.controller';
import { LibraryStudentController } from './library.student.controller';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Module({
  controllers: [LibraryController, LibraryStudentController],
  providers: [LibraryService, PrismaService],
})
export class LibraryModule {}
