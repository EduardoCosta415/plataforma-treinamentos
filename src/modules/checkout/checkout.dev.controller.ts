import { Body, Controller, Post, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PrismaService } from '../../infra/prisma/prisma.service';

type CreateDevDto = {
  nr: number;
  billingType: 'PIX' | 'BOLETO' | 'CREDIT_CARD';
};

type PayDevDto = {
  orderId: string;
};

@Controller('checkout/dev')
export class CheckoutDevController {
  constructor(private prisma: PrismaService) {}

  // ✅ precisa estar logado como STUDENT
  @UseGuards(AuthGuard('jwt'))
  @Post('create')
  async create(@Req() req: any, @Body() dto: CreateDevDto) {
    if (req.user?.role !== 'STUDENT') {
      throw new BadRequestException('Apenas aluno pode comprar.');
    }

    const nr = Number(dto.nr);
    if (!nr || nr < 1 || nr > 38) throw new BadRequestException('NR inválida.');

    // ✅ por enquanto: mapear NR -> Course (MVP)
    // Estratégia simples: procurar curso pelo title contendo "NR 01", "NR 02"...
    const nn = String(nr).padStart(2, '0');
    const course = await this.prisma.course.findFirst({
      where: { title: { contains: `NR ${nn}` } },
      select: { id: true },
    });

    if (!course) {
      throw new BadRequestException(`Curso NR ${nn} não encontrado no banco.`);
    }

    const totalCents = 4990;

    const order = await this.prisma.order.create({
      data: {
        studentId: req.user.sub,
        totalCents,
        status: 'PENDING_PAYMENT',
        items: {
          create: [{ courseId: course.id, unitPriceCents: totalCents }],
        },
        payment: {
          create: {
            billingType: dto.billingType === 'CREDIT_CARD' ? 'CREDIT_CARD' : 'PIX',
            status: 'PENDING',
            provider: 'DEV',
          },
        },
      },
      select: {
        id: true,
        status: true,
        totalCents: true,
        items: { select: { courseId: true } },
      },
    });

    return {
      orderId: order.id,
      status: order.status,
      totalCents: order.totalCents,
      courseId: order.items[0].courseId,
    };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('pay')
  async pay(@Req() req: any, @Body() dto: PayDevDto) {
    if (req.user?.role !== 'STUDENT') {
      throw new BadRequestException('Apenas aluno pode pagar.');
    }

    const order = await this.prisma.order.findFirst({
      where: { id: dto.orderId, studentId: req.user.sub },
      include: { items: true },
    });

    if (!order) throw new BadRequestException('Pedido não encontrado.');

    // marca pago
    await this.prisma.order.update({
      where: { id: order.id },
      data: { status: 'PAID' },
    });

    await this.prisma.payment.update({
      where: { orderId: order.id },
      data: { status: 'PAID' },
    });

    // ✅ vincula curso ao aluno (ajuste conforme seu modelo de vínculo real)
    const courseId = order.items[0]?.courseId;
    if (!courseId) throw new BadRequestException('Pedido sem itens.');

    // cria enrollment (se você usa esse)
    await this.prisma.studentCourseEnrollment.upsert({
      where: { studentId_courseId: { studentId: req.user.sub, courseId } },
      create: { studentId: req.user.sub, courseId, status: 'ACTIVE' },
      update: { status: 'ACTIVE' },
    });

    // cria studentCourse (se você usa esse também)
    await this.prisma.studentCourse.upsert({
      where: { studentId_courseId: { studentId: req.user.sub, courseId } },
      create: { studentId: req.user.sub, courseId },
      update: {},
    });

    return { ok: true, status: 'PAID' };
  }
}
