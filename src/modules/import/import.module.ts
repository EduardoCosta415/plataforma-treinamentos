import { Module } from '@nestjs/common';
import { ImportController } from './import.controller';
import { ImportService } from './import.service';
import { EnrollmentsModule } from '../enrollments/enrollments.module';

@Module({
  controllers: [ImportController],
  providers: [ImportService],
  imports:[EnrollmentsModule],
})
export class ImportModule {}
