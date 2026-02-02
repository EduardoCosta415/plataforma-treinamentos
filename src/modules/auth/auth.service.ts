import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../infra/prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // ✅ Login ADMIN (User + senha)
  async login(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = { sub: user.id, role: user.role, email: user.email };
    const access_token = await this.jwt.signAsync(payload);

    return {
      access_token,
      mustChangePassword: false,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  // ✅ Login ALUNO (Student + senha)
  async loginStudent(email: string, password: string) {
    const normalized = email.trim().toLowerCase();

    const student = await this.prisma.student.findUnique({
      where: { email: normalized },
    });

    if (!student || !student.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    // se ainda não tiver senha setada (antes da migration/script), bloqueia
    if (!student.passwordHash) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const ok = await bcrypt.compare(password, student.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = { sub: student.id, role: 'STUDENT', email: student.email };
    const access_token = await this.jwt.signAsync(payload);

    return {
      access_token,
      mustChangePassword: student.mustChangePassword,
      user: {
        id: student.id,
        email: student.email,
        fullName: student.fullName,
        role: 'STUDENT',
      },
    };
  }

  // ✅ Troca de senha (primeiro acesso)
  async changeStudentPassword(studentId: string, newPassword: string) {
    const pwd = (newPassword || '').trim();
    if (pwd.length < 6) {
      throw new BadRequestException('A senha deve ter no mínimo 6 caracteres');
    }

    const hash = await bcrypt.hash(pwd, 10);

    await this.prisma.student.update({
      where: { id: studentId },
      data: {
        passwordHash: hash,
        mustChangePassword: false,
      },
    });

    return { ok: true };
  }
}
