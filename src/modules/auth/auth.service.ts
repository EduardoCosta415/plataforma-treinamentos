import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { StudentRegisterDto } from './dto/student-register.dto';

@Injectable()
export class AuthService {
  private readonly DEFAULT_STUDENT_PASSWORD = '123456';

  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
  ) {}

  // =========================
  // Helpers
  // =========================
  private normalizeEmail(email: string) {
    return (email || '').trim().toLowerCase();
  }

  private normalizeString(value: string) {
    return (value || '').trim();
  }

  private normalizeCpf(value: string) {
    return (value || '').trim().replace(/\D/g, '');
  }

  private async signToken(payload: { sub: string; role: string; email: string }) {
    return this.jwt.signAsync(payload);
  }

  private getDefaultCompanyIdOrThrow() {
    const id = (process.env.DEFAULT_COMPANY_ID || '').trim();
    if (!id) {
      throw new BadRequestException(
        'DEFAULT_COMPANY_ID não configurado no .env (necessário para cadastrar aluno pela landing).',
      );
    }
    return id;
  }

  // =========================
  // ✅ Login ADMIN
  // =========================
  async login(email: string, password: string) {
    const normalized = this.normalizeEmail(email);

    const user = await this.prisma.user.findUnique({
      where: { email: normalized },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = { sub: user.id, role: user.role, email: user.email };
    const access_token = await this.signToken(payload);

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

  // =========================
  // ✅ Login ALUNO
  // =========================
  async loginStudent(email: string, password: string) {
    const normalized = this.normalizeEmail(email);

    const student = await this.prisma.student.findUnique({
      where: { email: normalized },
    });

    if (!student || !student.isActive) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    if (!student.passwordHash) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const ok = await bcrypt.compare(password, student.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const payload = { sub: student.id, role: 'STUDENT', email: student.email };
    const access_token = await this.signToken(payload);

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

  // =========================
  // ✅ Cadastro ALUNO (Landing) + Autologin
  // - senha default: 123456 (se não vier)
  // - company obrigatório (Prisma): resolve por companyName ou DEFAULT_COMPANY_ID
  // - cpf obrigatório (para certificado)
  // =========================
  async registerStudent(dto: StudentRegisterDto) {
    const fullName = this.normalizeString(dto.fullName);
    const email = this.normalizeEmail(dto.email);

    const cpf = this.normalizeCpf(dto.cpf);
    const companyName = this.normalizeString(dto.companyName || '');

    if (!fullName) throw new BadRequestException('Informe seu nome');
    if (!email) throw new BadRequestException('Informe seu email');

    if (!cpf || cpf.length !== 11 || !this.isValidCpf(cpf)) {
      throw new BadRequestException('CPF inválido');
    }

    const pwd =
      this.normalizeString(dto.password || '') || this.DEFAULT_STUDENT_PASSWORD;

    if (pwd.length < 6) {
      throw new BadRequestException('A senha deve ter no mínimo 6 caracteres');
    }

    // Email duplicado
    const existing = await this.prisma.student.findUnique({
      where: { email },
      select: { id: true },
    });
    if (existing) {
      throw new BadRequestException('Já existe uma conta com este email');
    }

    // CPF duplicado (cpf é unique no schema)
    const existingCpf = await this.prisma.student.findFirst({
      where: { cpf },
      select: { id: true },
    });
    if (existingCpf) {
      throw new BadRequestException('Já existe uma conta com este CPF');
    }

    // Resolve companyId
    let companyId: string;

    if (companyName) {
      const company = await this.prisma.company.findFirst({
        where: { name: { equals: companyName, mode: 'insensitive' } },
        select: { id: true },
      });

      if (!company) {
        throw new BadRequestException(
          'Empresa inválida para cadastro do aluno. Digite o nome exatamente como está no sistema.',
        );
      }

      companyId = company.id;
    } else {
      companyId = this.getDefaultCompanyIdOrThrow();

      const company = await this.prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true },
      });

      if (!company) {
        throw new BadRequestException(
          'Empresa inválida para cadastro do aluno (DEFAULT_COMPANY_ID não existe).',
        );
      }
    }

    const hash = await bcrypt.hash(pwd, 10);

    const student = await this.prisma.student.create({
      data: {
        fullName,
        email,
        cpf,
        passwordHash: hash,
        isActive: true,
        mustChangePassword: false,
        company: { connect: { id: companyId } },
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        mustChangePassword: true,
      },
    });

    const payload = { sub: student.id, role: 'STUDENT', email: student.email };
    const access_token = await this.signToken(payload);

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

  // =========================
  // ✅ Troca de senha (primeiro acesso)
  // =========================
  async changeStudentPassword(studentId: string, newPassword: string) {
    const pwd = this.normalizeString(newPassword);
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

  // =========================
  // CPF VALIDATION
  // =========================
  private isValidCpf(cpf: string): boolean {
    if (!cpf || cpf.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cpf)) return false;

    const calc = (base: string, factor: number) => {
      let total = 0;
      for (let i = 0; i < base.length; i++) {
        total += Number(base[i]) * (factor - i);
      }
      const mod = total % 11;
      return mod < 2 ? 0 : 11 - mod;
    };

    const d1 = calc(cpf.slice(0, 9), 10);
    const d2 = calc(cpf.slice(0, 10), 11);

    return d1 === Number(cpf[9]) && d2 === Number(cpf[10]);
  }
}
