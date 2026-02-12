import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { BillingType } from '@prisma/client';
import { AsaasService } from '../../infra/asaas/asaas.service';

@Injectable()
export class CheckoutService {
  constructor(
    private prisma: PrismaService,
    private asaas: AsaasService,
  ) {}

  async createOrder(studentId: string, courseIds: string[], billingType: BillingType) {
    if (!courseIds || courseIds.length === 0) {
      throw new BadRequestException('Nenhum curso selecionado');
    }

    // buscar cursos válidos e ativos
    const courses = await this.prisma.course.findMany({
      where: {
        id: { in: courseIds },
        isActive: true,
        isPaid: true,
      },
    });

    if (courses.length === 0) {
      throw new BadRequestException('Cursos inválidos');
    }

    // remover cursos já matriculados
    const enrolled = await this.prisma.studentCourseEnrollment.findMany({
      where: {
        studentId,
        courseId: { in: courses.map(c => c.id) },
      },
    });

    const enrolledIds = new Set(enrolled.map(e => e.courseId));
    const finalCourses = courses.filter(c => !enrolledIds.has(c.id));

    if (finalCourses.length === 0) {
      throw new BadRequestException('Você já possui matrícula em todos esses cursos');
    }

    // garantir que os cursos tenham preço setado
    const anyMissingPrice = finalCourses.some(c => !c.priceCents || c.priceCents <= 0);
    if (anyMissingPrice) {
      throw new BadRequestException('Existe curso pago sem preço configurado');
    }

    // calcular total
    const totalCents = finalCourses.reduce((sum, c) => sum + (c.priceCents ?? 0), 0);

    // criar pedido + itens + pagamento (local)
    const order = await this.prisma.order.create({
      data: {
        studentId,
        totalCents,
        items: {
          create: finalCourses.map(course => ({
            courseId: course.id,
            unitPriceCents: course.priceCents!,
          })),
        },
        payment: {
          create: {
            billingType,
            status: 'PENDING',
          },
        },
      },
      include: {
        payment: true,
      },
    });

    // buscar student (para criar customer no Asaas)
    const student = await this.prisma.student.findUnique({
      where: { id: studentId },
      select: { fullName: true, email: true, cpf: true },
    });

    if (!student) {
      throw new BadRequestException('Aluno não encontrado');
    }

    // 1) criar customer no Asaas
    const customer = await this.asaas.createCustomer({
      name: student.fullName,
      email: student.email,
      cpfCnpj: student.cpf || undefined, // usa CPF se tiver
    });

    if (!customer?.id) {
      throw new BadRequestException('Asaas não retornou customer.id');
    }

    // 2) criar pagamento no Asaas
    const asaasPayment = await this.asaas.createPayment({
      customerId: customer.id,
      value: order.totalCents / 100, // reais
      billingType: billingType === 'PIX' ? 'PIX' : 'CREDIT_CARD' ,
      externalReference: order.id,
      description: `Pedido ${order.id} - Cursos: ${finalCourses.length}`,
    });

    if (!asaasPayment?.id) {
      throw new BadRequestException('Asaas não retornou payment.id');
    }

    // 3) se for PIX, buscar QRCode
    let pix: any = null;
    if (billingType === 'PIX') {
      pix = await this.asaas.getPixQrCode(asaasPayment.id);
    }

    // salvar dados no Payment local
    await this.prisma.payment.update({
      where: { orderId: order.id },
      data: {
        providerPaymentId: asaasPayment.id,
        checkoutUrl: asaasPayment.invoiceUrl || null,
      },
    });

    return {
      orderId: order.id,
      totalCents: order.totalCents,
      providerPaymentId: asaasPayment.id,
      invoiceUrl: asaasPayment.invoiceUrl || null,
      pixQrCode: pix?.encodedImage || null,
      pixPayload: pix?.payload || null,
    };
  }
}
