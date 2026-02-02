import {
  Controller,
  Get,
  Query,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';

@UseGuards(AuthGuard('jwt'))
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  private assertAdmin(req: any) {
    if (req.user?.role !== 'ADMIN') {
      throw new ForbiddenException('Acesso permitido apenas para ADMIN');
    }
  }

  // ✅ cards do topo
  @Get('summary')
  async summary(@Req() req: any) {
    this.assertAdmin(req);
    return this.dashboard.getSummary();
  }

  // ✅ gráfico "alunos por mês"
  @Get('students-per-month')
  async studentsPerMonth(@Req() req: any, @Query('months') months?: string) {
    this.assertAdmin(req);
    const m = Math.max(1, Math.min(24, Number(months || 6)));
    return this.dashboard.getStudentsPerMonth(m);
  }

  // ✅ gráfico "progresso por curso"
  @Get('course-progress')
  async courseProgress(@Req() req: any, @Query('limit') limit?: string) {
    this.assertAdmin(req);
    const l = Math.max(1, Math.min(20, Number(limit || 8)));
    return this.dashboard.getCourseProgress(l);
  }
}
