import { Module } from '@nestjs/common';
import { ExamsController } from './exams.controller';
import { ExamsService } from './exams.service';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { RolesGuard } from '../auth/roles.guards';
import { StudentExamsController } from './student-exams.controller';

@Module({
  controllers: [ExamsController, StudentExamsController],
  providers: [ExamsService, PrismaService, RolesGuard],
})
export class ExamsModule {}
