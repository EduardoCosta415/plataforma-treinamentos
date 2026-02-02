import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../infra/prisma/prisma.service';
import { CreateCompanyDto } from './dto/create-company.dto';

@Injectable()
export class CompaniesService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.company.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: CreateCompanyDto) {
    return this.prisma.company.create({
      data: {
        name: dto.name,
        cnpj: dto.cnpj || null,
        email: dto.email || null,
        phone: dto.phone || null,
      },
    });
  }
}
