import { Module } from '@nestjs/common';
import { CoursesController } from './courses.controller';
import { CoursesService } from './courses.service';

/**
 * Module organiza o contexto do domínio
 * Tudo que é "curso" fica aqui
 */
@Module({
  controllers: [CoursesController],
  providers: [CoursesService],
})
export class CoursesModule {}
