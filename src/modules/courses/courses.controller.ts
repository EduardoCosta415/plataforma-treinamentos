import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

/**
 * Controller define as rotas HTTP.
 * Aqui a gente só:
 * - recebe request
 * - valida DTO
 * - chama o service
 *
 * Regra de negócio pesada e banco ficam no service.
 */
@UseGuards(AuthGuard('jwt')) // protege tudo com JWT
@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  /**
   * GET /courses
   * Lista todos os cursos ativos (admin)
   */
  @Get()
  list() {
    return this.courses.list();
  }

  /**
   * GET /courses/min
   * Lista mínima de cursos (id + title)
   * Usado em selects (ex: vincular prova ao curso)
   */
  @Get('min')
  listMin() {
    return this.courses.listMin();
  }

  /**
   * POST /courses
   * Cria um curso
   */
  @Post()
  create(@Body() dto: CreateCourseDto) {
    return this.courses.create(dto);
  }

  /**
   * GET /courses/:id/tree
   * Retorna curso -> módulos -> aulas
   */
  @Get(':id/tree')
  getTree(@Param('id') id: string) {
    return this.courses.getTree(id);
  }

  /**
   * PATCH /courses/:id
   * Atualiza dados do curso
   */
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.courses.update(id, dto);
  }

  /**
   * DELETE /courses/:id
   * Desativa curso (soft delete)
   */
  @Delete(':id')
  deactivate(@Param('id') id: string) {
    return this.courses.deactivate(id);
  }
}
