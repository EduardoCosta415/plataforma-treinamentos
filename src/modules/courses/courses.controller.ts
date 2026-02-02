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
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CoursesService } from './courses.service';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';

@ApiTags('Cursos')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt')) // protege tudo com JWT
@Controller('courses')
export class CoursesController {
  constructor(private readonly courses: CoursesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar todos os cursos ativos (admin)' })
  @ApiResponse({
    status: 200,
    description: 'Lista de cursos retornada com sucesso.',
  })
  list() {
    return this.courses.list();
  }

  @Get('min')
  @ApiOperation({ summary: 'Listar cursos em formato mínimo (id e título)' })
  @ApiResponse({
    status: 200,
    description: 'Lista mínima de cursos retornada com sucesso.',
  })
  listMin() {
    return this.courses.listMin();
  }

  @Post()
  @ApiOperation({ summary: 'Criar um novo curso' })
  @ApiResponse({ status: 201, description: 'Curso criado com sucesso.' })
  @ApiResponse({ status: 400, description: 'Dados inválidos.' })
  create(@Body() dto: CreateCourseDto) {
    return this.courses.create(dto);
  }

  @Get(':id/tree')
  @ApiOperation({ summary: 'Obter a árvore de um curso (módulos e aulas)' })
  @ApiParam({ name: 'id', description: 'ID do curso' })
  @ApiResponse({
    status: 200,
    description: 'Árvore do curso retornada com sucesso.',
  })
  @ApiResponse({ status: 404, description: 'Curso não encontrado.' })
  getTree(@Param('id') id: string) {
    return this.courses.getTree(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar um curso existente' })
  @ApiParam({ name: 'id', description: 'ID do curso a ser atualizado' })
  @ApiResponse({ status: 200, description: 'Curso atualizado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Curso não encontrado.' })
  update(@Param('id') id: string, @Body() dto: UpdateCourseDto) {
    return this.courses.update(id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desativar um curso (soft delete)' })
  @ApiParam({ name: 'id', description: 'ID do curso a ser desativado' })
  @ApiResponse({ status: 200, description: 'Curso desativado com sucesso.' })
  @ApiResponse({ status: 404, description: 'Curso não encontrado.' })
  deactivate(@Param('id') id: string) {
    return this.courses.deactivate(id);
  }
}
