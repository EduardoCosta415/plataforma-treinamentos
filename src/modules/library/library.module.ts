import { Module } from '@nestjs/common';

import { LibraryService } from './library.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { LibraryController } from './library.controller';

@Module({
  controllers:[LibraryController],
  providers: [LibraryService, PrismaService],
  exports: [LibraryService],
})
export class LibraryModule {}
