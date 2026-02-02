import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { parse } from 'csv-parse/sync';
import { EnrollmentsService } from '../enrollments/enrollments.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class ImportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly enrollments: EnrollmentsService,
  ) {}

  async importUsersFromCsv(file: Express.Multer.File) {
    const content = file.buffer.toString('utf-8');

    const records: any[] = parse(content, {
      columns: true, // usa header
      skip_empty_lines: true,
      trim: true,
    });

    if (!records.length) {
      throw new BadRequestException('CSV vazio ou inválido');
    }

    const results = {
      createdStudents: 0,
      updatedStudents: 0,
      enrolled: 0,
      errors: [] as any[],
    };

    // ✅ Senha temporária padrão para alunos criados via importação
    // (depois você pode gerar aleatória e enviar por email)
    const TEMP_PASSWORD = '123456';
    const TEMP_PASSWORD_HASH = await bcrypt.hash(TEMP_PASSWORD, 10);

    for (const [index, row] of records.entries()) {
      try {
        /**
         * Esperado no CSV:
         * companyName, studentName, studentEmail, courseTitle(opcional)
         */
        const companyName = String(row.companyName || '').trim();
        const studentName = String(row.studentName || '').trim();
        const studentEmail = String(row.studentEmail || '').trim().toLowerCase();
        const courseTitle = String(row.courseTitle || '').trim();

        if (!companyName || !studentName || !studentEmail) {
          throw new Error(
            'Campos obrigatórios ausentes (companyName, studentName, studentEmail)',
          );
        }

        // 1) Empresa (find ou create)
        let company = await this.prisma.company.findFirst({
          where: { name: companyName },
        });

        if (!company) {
          company = await this.prisma.company.create({
            data: { name: companyName },
          });
        }

        // 2) Aluno (create ou update)
        const existingStudent = await this.prisma.student.findUnique({
          where: { email: studentEmail },
        });

        let student;

        if (existingStudent) {
          student = await this.prisma.student.update({
            where: { email: studentEmail },
            data: {
              fullName: studentName,
              company: { connect: { id: company.id } },
            },
          });
          results.updatedStudents++;
        } else {
          student = await this.prisma.student.create({
            data: {
              fullName: studentName,
              email: studentEmail,

              // ✅ obrigatório no seu schema atual
              passwordHash: TEMP_PASSWORD_HASH,
              mustChangePassword: true,

              // ✅ em vez de companyId direto
              company: { connect: { id: company.id } },
            },
          });
          results.createdStudents++;
        }

        // 3) Curso inicial (opcional) + matrícula real
        if (courseTitle) {
          const course = await this.prisma.course.findFirst({
            where: { title: courseTitle },
          });

          if (!course) {
            throw new Error(`Curso não encontrado: "${courseTitle}"`);
          }

          await this.enrollments.enroll(student.id, course.id);
          results.enrolled++;
        }
      } catch (error: any) {
        results.errors.push({
          line: index + 2, // +2 por causa do header
          message: error?.message || 'Erro desconhecido',
          row,
        });
      }
    }

    return results;
  }
}
