import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class EnrollmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Matricula um aluno em um curso
   * - idempotente (não duplica)
   */
  async enroll(studentId: string, courseId: string) {
    return this.prisma.studentCourse.upsert({
      where: {
        studentId_courseId: { studentId, courseId },
      },
      update: {},
      create: {
        studentId,
        courseId,
      },
    });
  }

  /**
   * Remove matrícula (desmatricular)
   */
  async remove(studentId: string, courseId: string) {
    return this.prisma.studentCourse.delete({
      where: {
        studentId_courseId: { studentId, courseId },
      },
    });
  }
}
