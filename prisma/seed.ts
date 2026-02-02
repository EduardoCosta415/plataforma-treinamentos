import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash('admin123', 10);

  await prisma.user.upsert({
    where: { email: 'admin@admin.com' },
    update: {},
    create: {
      email: 'admin@admin.com',
      fullName: 'Administrador',
      passwordHash,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log('✅ Usuário ADMIN criado');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
