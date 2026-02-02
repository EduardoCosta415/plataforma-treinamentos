import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { AdminCreateExamDto } from './dto/admin-create-exam.dto';
import { AdminUpdateExamDto } from './dto/admin-update-exam.dto';
import { AdminUpsertQuestionDto } from './dto/admin-upsert-question.dto';

type StudentAnswerDto = { questionId: string; optionId: string };
type SubmitAttemptDto = { answers: StudentAnswerDto[] };

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  // =========================================================
  // CONFIGS (fáceis de mudar depois)
  // =========================================================
  private readonly PASS_SCORE_PERCENT = 75; // ✅ aprovou se >= 75
  private readonly MAX_ATTEMPTS_PER_EXAM = Number(
    process.env.EXAM_MAX_ATTEMPTS ?? 3,
  ); // ✅ default 3

  // =========================================================
  // ✅ ADMIN - EXAMS (CRUD)
  // =========================================================

  async listExams() {
    return this.prisma.exam.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, title: true } },
        _count: { select: { questions: true, attempts: true } },
      },
    });
  }

  async getExam(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        course: { select: { id: true, title: true } },
        questions: {
          orderBy: { order: 'asc' },
          include: { options: true },
        },
        _count: { select: { attempts: true } },
      },
    });

    if (!exam) throw new NotFoundException('Prova não encontrada');
    return exam;
  }

  async createExam(dto: AdminCreateExamDto) {
    const course = await this.prisma.course.findUnique({
      where: { id: dto.courseId },
      select: { id: true },
    });
    if (!course) throw new BadRequestException('Curso inválido');

    const existing = await this.prisma.exam.findUnique({
      where: { courseId: dto.courseId },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException(
        'Este curso já possui uma prova cadastrada.',
      );
    }

    return this.prisma.exam.create({
      data: {
        courseId: dto.courseId,
        title: dto.title.trim(),
        passScore: dto.passScore ?? 70,
        isActive: dto.isActive ?? true,
      },
      include: { course: { select: { id: true, title: true } } },
    });
  }

  async updateExam(examId: string, dto: AdminUpdateExamDto) {
    const existing = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Prova não encontrada');

    return this.prisma.exam.update({
      where: { id: examId },
      data: {
        title: dto.title?.trim(),
        passScore: dto.passScore,
        isActive: dto.isActive,
      },
    });
  }

  async deleteExam(examId: string) {
    const existing = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Prova não encontrada');

    return this.prisma.exam.delete({ where: { id: examId } });
  }

  // =========================================================
  // ✅ ADMIN - QUESTIONS (CRUD)
  // =========================================================

  private validateOptions(options: { label: string; isCorrect?: boolean }[]) {
    const correctCount = options.filter((o) => !!o.isCorrect).length;
    if (correctCount !== 1) {
      throw new BadRequestException(
        'A pergunta deve ter exatamente 1 opção correta.',
      );
    }
  }

  async addQuestion(examId: string, dto: AdminUpsertQuestionDto) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      select: { id: true },
    });
    if (!exam) throw new NotFoundException('Prova não encontrada');

    const options = (dto.options || []).map((o) => ({
      label: (o.label || '').trim(),
      isCorrect: !!o.isCorrect,
    }));

    this.validateOptions(options);

    return this.prisma.examQuestion.create({
      data: {
        examId,
        title: dto.title.trim(),
        order: dto.order,
        options: { create: options },
      },
      include: { options: true },
    });
  }

  async updateQuestion(questionId: string, dto: AdminUpsertQuestionDto) {
    const q = await this.prisma.examQuestion.findUnique({
      where: { id: questionId },
      select: { id: true },
    });
    if (!q) throw new NotFoundException('Pergunta não encontrada');

    const options = (dto.options || []).map((o) => ({
      label: (o.label || '').trim(),
      isCorrect: !!o.isCorrect,
    }));

    this.validateOptions(options);

    return this.prisma.$transaction(async (tx) => {
      await tx.examOption.deleteMany({ where: { questionId } });

      return tx.examQuestion.update({
        where: { id: questionId },
        data: {
          title: dto.title.trim(),
          order: dto.order,
          options: { create: options },
        },
        include: { options: true },
      });
    });
  }

  async deleteQuestion(questionId: string) {
    const q = await this.prisma.examQuestion.findUnique({
      where: { id: questionId },
      select: { id: true },
    });
    if (!q) throw new NotFoundException('Pergunta não encontrada');

    return this.prisma.examQuestion.delete({ where: { id: questionId } });
  }

  // =========================================================
  // ✅ STUDENT - VIEW EXAM (sem revelar isCorrect)
  // =========================================================

  async getStudentExam(examId: string, studentId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { select: { id: true, label: true } } },
        },
      },
    });

    if (!exam) throw new NotFoundException('Prova não encontrada');
    if (!exam.isActive) {
      throw new BadRequestException('Esta prova está desativada');
    }

    const allowed = await this.isCourseCompletedForStudent(
      studentId,
      exam.courseId,
    );
    if (!allowed) {
      throw new ForbiddenException('Conclua o curso para liberar a prova');
    }

    return {
      id: exam.id,
      courseId: exam.courseId,
      title: exam.title,
      passScore: exam.passScore,
      isActive: exam.isActive,
      questions: (exam.questions || []).map((q) => ({
        id: q.id,
        title: q.title,
        order: q.order,
        options: q.options || [],
      })),
    };
  }

  // =========================================================
  // ✅ STUDENT - START ATTEMPT
  // =========================================================

  async startStudentAttempt(examId: string, studentId: string) {
    const examView = await this.getStudentExam(examId, studentId);

    const passedAttempt = await this.prisma.studentExamAttempt.findFirst({
      where: { studentId, examId, passed: true },
      select: { id: true },
    });
    if (passedAttempt) {
      throw new BadRequestException('Você já foi aprovado nesta prova.');
    }

    const count = await this.prisma.studentExamAttempt.count({
      where: { studentId, examId },
    });

    if (count >= this.MAX_ATTEMPTS_PER_EXAM) {
      throw new BadRequestException(
        `Limite de tentativas atingido (${this.MAX_ATTEMPTS_PER_EXAM}).`,
      );
    }

    const attempt = await this.prisma.studentExamAttempt.create({
      data: {
        studentId,
        examId,
        attemptNumber: count + 1,
        scorePercent: 0,
        passed: false,
        finishedAt: null,
      },
      select: { id: true, attemptNumber: true },
    });

    return {
      attemptId: attempt.id,
      attemptNumber: attempt.attemptNumber,
      maxAttempts: this.MAX_ATTEMPTS_PER_EXAM,
      passMinPercent: this.PASS_SCORE_PERCENT,
      exam: examView,
    };
  }

  // =========================================================
  // ✅ STUDENT - SUBMIT ATTEMPT (gera certificado se passar)
  // =========================================================

  async submitStudentAttempt(
    attemptId: string,
    studentId: string,
    dto: SubmitAttemptDto,
  ) {
    const attempt = await this.prisma.studentExamAttempt.findUnique({
      where: { id: attemptId },
      include: {
        exam: {
          include: {
            questions: {
              orderBy: { order: 'asc' },
              include: { options: true }, // ✅ aqui precisa do isCorrect
            },
          },
        },
      },
    });

    if (!attempt) throw new NotFoundException('Tentativa não encontrada');
    if (attempt.studentId !== studentId) {
      throw new ForbiddenException('Tentativa não pertence ao aluno');
    }
    if (attempt.finishedAt) {
      throw new BadRequestException('Esta tentativa já foi finalizada');
    }
    if (!attempt.exam) throw new BadRequestException('Prova inválida');
    if (!attempt.exam.isActive) throw new BadRequestException('Prova desativada');

    // ✅ se já passou em outra tentativa, bloqueia submit
    const alreadyPassed = await this.prisma.studentExamAttempt.findFirst({
      where: { studentId, examId: attempt.examId, passed: true },
      select: { id: true },
    });
    if (alreadyPassed) {
      throw new BadRequestException('Você já foi aprovado nesta prova.');
    }

    // ✅ gate também no submit
    const allowed = await this.isCourseCompletedForStudent(
      studentId,
      attempt.exam.courseId,
    );
    if (!allowed) {
      throw new ForbiddenException('Conclua o curso para liberar a prova');
    }

    const questions = attempt.exam.questions || [];
    if (!questions.length) throw new BadRequestException('Prova sem perguntas');

    const sent = dto?.answers || [];
    if (!sent.length) throw new BadRequestException('Envie as respostas');

    const sentByQuestion = new Map<string, string>();
    for (const a of sent) {
      if (a?.questionId && a?.optionId) {
        sentByQuestion.set(a.questionId, a.optionId);
      }
    }

    // ✅ exige todas respondidas
    for (const q of questions) {
      if (!sentByQuestion.has(q.id)) {
        throw new BadRequestException(
          'Responda todas as perguntas antes de finalizar',
        );
      }
    }

    // ✅ valida integridade (opção pertence à pergunta)
    for (const q of questions) {
      const chosenId = sentByQuestion.get(q.id)!;
      const opt = q.options.find((o) => o.id === chosenId);
      if (!opt) throw new BadRequestException('Opção inválida enviada');
    }

    // ✅ corrige
    let correct = 0;
    for (const q of questions) {
      const chosenId = sentByQuestion.get(q.id)!;
      const right = q.options.find((o) => o.isCorrect);
      if (right && chosenId === right.id) correct++;
    }

    const total = questions.length;
    const scorePercent = total > 0 ? Math.round((correct / total) * 100) : 0;
    const passed = scorePercent >= this.PASS_SCORE_PERCENT;

    const courseId = attempt.exam.courseId;

    const updatedAttempt = await this.prisma.$transaction(async (tx) => {
      await tx.studentExamAnswer.deleteMany({ where: { attemptId } });

      await tx.studentExamAnswer.createMany({
        data: questions.map((q) => ({
          attemptId,
          questionId: q.id,
          optionId: sentByQuestion.get(q.id)!,
        })),
      });

      const savedAttempt = await tx.studentExamAttempt.update({
        where: { id: attemptId },
        data: {
          scorePercent,
          passed,
          finishedAt: new Date(),
        },
        select: {
          id: true,
          attemptNumber: true,
          scorePercent: true,
          passed: true,
          finishedAt: true,
        },
      });

      // ✅ CERTIFICADO (do zero, simples):
      // - Se passou, garante 1 por aluno+curso
      // - Usa attemptId para rastrear qual tentativa gerou
      if (passed) {
        await tx.certificate.upsert({
          where: {
            studentId_courseId: { studentId, courseId },
          },
          update: {
            scorePercent: savedAttempt.scorePercent,
            attemptId: savedAttempt.id,
            issuedAt: new Date(),
          },
          create: {
            studentId,
            courseId,
            scorePercent: savedAttempt.scorePercent,
            attemptId: savedAttempt.id,
            issuedAt: new Date(),
          },
        });
      }

      return savedAttempt;
    });

    return {
      ...updatedAttempt,
      correctAnswers: correct,
      totalQuestions: total,
      passMinPercent: this.PASS_SCORE_PERCENT,
    };
  }

  // =========================================================
  // HELPERS
  // =========================================================

  private async isCourseCompletedForStudent(
    studentId: string,
    courseId: string,
  ): Promise<boolean> {
    // 1) enrollment.completedAt
    const enrollment = await this.prisma.studentCourseEnrollment.findFirst({
      where: { studentId, courseId },
      select: { completedAt: true },
    });
    if (enrollment?.completedAt) return true;

    // 2) fallback 100% aulas concluídas
    const modules = await this.prisma.module.findMany({
      where: { courseId },
      select: { id: true },
    });
    if (!modules.length) return false;

    const lessons = await this.prisma.lesson.findMany({
      where: { moduleId: { in: modules.map((m) => m.id) } },
      select: { id: true },
    });
    if (!lessons.length) return false;

    const completedCount = await this.prisma.studentLessonProgress.count({
      where: {
        studentId,
        lessonId: { in: lessons.map((l) => l.id) },
        completed: true,
      },
    });

    return completedCount === lessons.length;
  }

  // =========================================================
  // ADAPTERS (pra bater com seu controller atual)
  // =========================================================

  async startAttempt(studentId: string, examId: string) {
    return this.startStudentAttempt(examId, studentId);
  }

  async submitAttempt(
    studentId: string,
    attemptId: string,
    body: { answers: { questionId: string; optionId: string }[] },
  ) {
    return this.submitStudentAttempt(attemptId, studentId, body);
  }
}
